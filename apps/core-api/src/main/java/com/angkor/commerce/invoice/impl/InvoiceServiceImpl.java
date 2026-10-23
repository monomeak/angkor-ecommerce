package com.angkor.commerce.invoice.impl;

import com.angkor.commerce.common.CollectionKeys;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.common.exception.ResourceNotFoundException;
import com.angkor.commerce.common.exception.ValidationException;
import com.angkor.commerce.common.util.DocumentNumberGenerator;
import com.angkor.commerce.invoice.Invoice;
import com.angkor.commerce.invoice.InvoiceCalculator;
import com.angkor.commerce.invoice.InvoiceItem;
import com.angkor.commerce.invoice.InvoiceRepository;
import com.angkor.commerce.invoice.InvoiceService;
import com.angkor.commerce.invoice.InvoiceStatus;
import com.angkor.commerce.invoice.dto.request.InvoiceQueryParams;
import com.angkor.commerce.invoice.dto.response.InvoiceResponse;
import com.angkor.commerce.invoice.dto.response.InvoiceSummaryResponse;
import com.angkor.commerce.invoice.mapper.InvoiceMapper;
import com.angkor.commerce.invoice.specification.InvoiceSpecification;
import com.angkor.commerce.order.Order;
import com.angkor.commerce.order.OrderItem;
import com.angkor.commerce.payment.Payment;
import com.angkor.commerce.payment.PaymentStatus;
import com.angkor.commerce.product.repositories.ProductRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
@Service
@Slf4j
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    private final InvoiceRepository invoiceRepository;
    private final InvoiceCalculator calculator;
    private final DocumentNumberGenerator invoiceNumberGenerator;
    private final InvoiceMapper invoiceMapper;
    private final ProductRepository productRepository;

    // ══════════════════════════════════════════════════════
    // Creation — the only way an invoice comes into existence
    // ══════════════════════════════════════════════════════
    @Override
    @Transactional
    public Invoice createIssuedInvoiceFromOrder(Order order) {
        if (invoiceRepository.existsByOrderIdAndStatusNot(order.getId(), RecordStatus.DELETED)) {
            throw new ValidationException("Order " + order.getOrderNumber() + " already has an invoice");
        }

        // get actual day
        LocalDate today = LocalDate.now(ZONE);
        Invoice invoice = new Invoice();

        // set all value to invoice obj

        invoice.setInvoiceNumber(invoiceNumberGenerator.next());
        invoice.setCustomer(order.getCustomer());
        invoice.setOrderId(order.getId());
        invoice.setInvoiceStatus(InvoiceStatus.ISSUED);
        invoice.setIssueDate(today);
        invoice.setDueDate(today);
        invoice.setIssuedAt(Instant.now());
        invoice.setCurrency(order.getCurrency());

        copyOrderLines(order, invoice);
        calculator.recalculate(invoice);

        return invoiceRepository.save(invoice);
    }

    /**
     * Recomputes paid_amount, balance and status from COMPLETED
     * payments. Always called inside the caller's transaction, always
     * after the caller has locked the invoice.
     */
    @Override
    @Transactional
    public void refreshPaymentState(Invoice invoice) {
        BigDecimal paid = invoice
            .getPayments()
            .stream()
            .filter(p -> p.getPaymentStatus() == PaymentStatus.COMPLETED)
            .map(Payment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        invoice.setPaidAmount(paid);
        invoice.recalculateBalance(); // ← the DB CHECK depends on this

        // CANCELLED is terminal. Voiding a payment on a cancelled invoice
        // recomputes what it owes but must never bring it back to life.
        if (invoice.getInvoiceStatus() == InvoiceStatus.CANCELLED) {
            return;
        }

        InvoiceStatus next = statusFor(invoice);
        invoice.setInvoiceStatus(next);

        // Reports are on a cash basis, so the settlement date is stamped here rather than
        // derived at query time. Clearing it on the way out of PAID is what lets a voided
        // payment drop the invoice out of last month's report instead of stranding it there.
        if (next == InvoiceStatus.PAID) {
            if (invoice.getPaidAt() == null) {
                invoice.setPaidAt(Instant.now());
            }
        } else {
            invoice.setPaidAt(null);
        }
    }

    /** The money decides: nothing paid → ISSUED, part paid → PARTIALLY_PAID, settled → PAID. */
    private InvoiceStatus statusFor(Invoice invoice) {
        if (invoice.getBalance().compareTo(BigDecimal.ZERO) == 0) {
            return InvoiceStatus.PAID;
        }
        return invoice.getPaidAmount().compareTo(BigDecimal.ZERO) > 0
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.ISSUED;
    }

    @Override
    public InvoiceResponse getInvoice(Long invoiceId) {
        return invoiceMapper.toResponse(load(invoiceId));
    }

    @Override
    public PageResponse<InvoiceSummaryResponse> getInvoices(InvoiceQueryParams query) {
        return toPageResponse(find(query, null), query);
    }

    /**
     * The same query as the back office's, with the customer pinned to the session — a
     * customer sending ?customerId= cannot widen it past their own invoices.
     */
    @Override
    public PageResponse<InvoiceSummaryResponse> getMyInvoices(Long customerId, InvoiceQueryParams query) {
        return toPageResponse(find(query, customerId), query);
    }

    private Page<Invoice> find(InvoiceQueryParams query, Long customerId) {
        return invoiceRepository.findAll(InvoiceSpecification.from(query, customerId), query.toPageable());
    }

    @Override
    public InvoiceResponse getMyInvoice(Long customerId, Long invoiceId) {
        Invoice invoice = load(invoiceId);
        // Same rule as orders: someone else's invoice is a 404, not a 403
        if (!invoice.getCustomer().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Invoice " + invoiceId + " was not found");
        }

        return invoiceMapper.toResponse(invoice);
    }

    /** The receipt for an order the customer has paid. Absent until the payment lands. */
    @Override
    public InvoiceResponse getMyInvoiceForOrder(Long customerId, Long orderId) {
        Invoice invoice = invoiceRepository
            .findByOrderIdAndStatusNot(orderId, RecordStatus.DELETED)
            .orElseThrow(() -> new ResourceNotFoundException("Order " + orderId + " has no invoice"));

        if (!invoice.getCustomer().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Order " + orderId + " has no invoice");
        }

        return invoiceMapper.toResponse(invoice);
    }

    // ══════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════

    /** The one definition of "order lines → invoice lines". */
    private void copyOrderLines(Order order, Invoice invoice) {
        Map<Long, String> categories = rootCategoriesFor(order);

        for (OrderItem orderItem : order.getItems()) {
            InvoiceItem item = new InvoiceItem();
            item.setProductId(orderItem.getProductId());
            item.setSku(orderItem.getSku());
            item.setTitle(orderItem.getTitle());
            item.setThumbnailUrl(orderItem.getThumbnailUrl());
            item.setCategory(categories.get(orderItem.getProductId()));
            item.setUnit("piece");
            item.setPrice(orderItem.getUnitPriceSnapshot());
            item.setQuantity(orderItem.getQuantity());
            item.setDiscountPercentage(BigDecimal.ZERO); // HACK
            invoice.addItem(item);
        }

        // invoices have no shipping_fee column → it becomes a line
        if (order.getShippingFee().compareTo(BigDecimal.ZERO) > 0) {
            InvoiceItem delivery = new InvoiceItem();
            delivery.setTitle("Delivery");
            delivery.setUnit("service");
            delivery.setPrice(order.getShippingFee());
            delivery.setQuantity(1);
            delivery.setDiscountPercentage(BigDecimal.ZERO);
            invoice.addItem(delivery);
        }
    }

    /** One lookup for the whole order; a deleted product simply has no category to snapshot. */
    private Map<Long, String> rootCategoriesFor(Order order) {
        Set<Long> productIds = order
            .getItems()
            .stream()
            .map(OrderItem::getProductId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        if (productIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> categories = new HashMap<>();
        for (Object[] row : productRepository.findRootCategoryNames(productIds)) {
            categories.put((Long) row[0], (String) row[1]);
        }

        return categories;
    }

    private Invoice load(Long id) {
        return invoiceRepository
            .findActiveWithItemsById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Invoice " + id + " was not found"));
    }

    private PageResponse<InvoiceSummaryResponse> toPageResponse(Page<Invoice> page, InvoiceQueryParams query) {
        if (page.isEmpty()) {
            return PageResponse.empty(CollectionKeys.INVOICES, query.skipOrDefault(), query.limitOrDefault());
        }
        return PageResponse.of(
            CollectionKeys.INVOICES,
            page.getContent().stream().map(invoiceMapper::toSummary).toList(),
            page.getTotalElements(),
            query.skipOrDefault(),
            query.limitOrDefault()
        );
    }
}
