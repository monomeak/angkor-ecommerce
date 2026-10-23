package com.angkor.commerce.invoice.mapper;

import com.angkor.commerce.common.storage.ImageStorageService;
import com.angkor.commerce.customer.dto.response.CustomerSummaryResponse;
import com.angkor.commerce.invoice.Invoice;
import com.angkor.commerce.invoice.InvoiceItem;
import com.angkor.commerce.invoice.InvoiceStatus;
import com.angkor.commerce.invoice.dto.response.InvoiceItemResponse;
import com.angkor.commerce.invoice.dto.response.InvoiceResponse;
import com.angkor.commerce.invoice.dto.response.InvoiceSummaryResponse;
import com.angkor.commerce.payment.Payment;
import com.angkor.commerce.payment.dto.response.PaymentSummaryResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InvoiceMapper {

    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    /** Newest payment first; ties broken by id so the order is stable across calls. */
    private static final Comparator<Payment> BY_DATE_DESC = Comparator.comparing(Payment::getPaymentDate)
        .thenComparing(Payment::getId)
        .reversed();

    private final ImageStorageService imageStorageService;

    // ── Invoice → DTO ──────────────────────────────────────

    /**
     * Needs {@code items} loaded — pair with {@code InvoiceRepository.findActiveWithItemId}.
     * {@code payments} is lazy, so call inside the transaction.
     */
    public InvoiceResponse toResponse(Invoice invoice) {
        return new InvoiceResponse(
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getInvoiceStatus(),
            invoice.getOrderId(),
            CustomerSummaryResponse.from(invoice.getCustomer()),
            invoice.getItems().stream().map(this::toItemResponse).toList(),
            toPaymentSummaries(invoice.getPayments()),
            invoice.getIssueDate(),
            invoice.getDueDate(),
            invoice.getSubtotal(),
            invoice.getDiscountPercentage(),
            invoice.getDiscountAmount(),
            invoice.getTaxPercentage(),
            invoice.getTaxAmount(),
            invoice.getTotal(),
            invoice.getPaidAmount(),
            invoice.getBalance(),
            invoice.getCurrency(),
            invoice.getTotalItems(),
            invoice.getTotalQuantity(),
            invoice.getNotes(),
            invoice.getIssuedAt(),
            invoice.getCancelledAt(),
            invoice.getCancellationReason(),
            invoice.getCreatedAt(),
            invoice.getUpdatedAt()
        );
    }

    /** List rows — only {@code customer} has to be loaded, never items or payments. */
    public InvoiceSummaryResponse toSummary(Invoice invoice) {
        return new InvoiceSummaryResponse(
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getInvoiceStatus(),
            invoice.getCustomer().getId(),
            invoice.getCustomer().getDisplayName(),
            invoice.getIssueDate(),
            invoice.getDueDate(),
            invoice.getTotal(),
            invoice.getPaidAmount(),
            invoice.getBalance(),
            invoice.getCurrency()
        );
    }

    public InvoiceItemResponse toItemResponse(InvoiceItem item) {
        return new InvoiceItemResponse(
            item.getId(),
            item.getLineNumber(),
            item.getProductId(),
            item.getSku(),
            item.getTitle(),
            item.getCategory(),
            item.getDescription(),
            imageStorageService.resolveUrl(item.getThumbnailUrl()),
            item.getUnit(),
            item.getPrice(),
            item.getQuantity(),
            item.getTotal(),
            item.getDiscountPercentage(),
            item.getDiscountedTotal()
        );
    }

    public List<PaymentSummaryResponse> toPaymentSummaries(List<Payment> payments) {
        return payments.stream().sorted(BY_DATE_DESC).map(InvoiceMapper::toPaymentSummary).toList();
    }

    public static PaymentSummaryResponse toPaymentSummary(Payment payment) {
        return new PaymentSummaryResponse(
            payment.getId(),
            payment.getAmount(),
            payment.getPaymentMethod(),
            payment.getPaymentStatus(),
            payment.getSource(),
            payment.getPaymentDate(),
            payment.getReferenceNumber()
        );
    }

    // ── Derived fields ─────────────────────────────────────

    /**
     * Display truth, not stored truth: an invoice reads as overdue the moment the due date
     * passes, even though {@code invoiceStatus} still says ISSUED/PARTIALLY_PAID until the
     * nightly job flips it. Keeps the list from showing a paid-by-nobody invoice as current
     * for up to a day.
     */
}
