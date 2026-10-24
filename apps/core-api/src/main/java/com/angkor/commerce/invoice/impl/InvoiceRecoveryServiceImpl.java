package com.angkor.commerce.invoice.impl;

import com.angkor.commerce.common.exception.ResourceNotFoundException;
import com.angkor.commerce.common.exception.ValidationException;
import com.angkor.commerce.invoice.Invoice;
import com.angkor.commerce.invoice.InvoiceRecoveryService;
import com.angkor.commerce.invoice.InvoiceService;
import com.angkor.commerce.invoice.dto.request.RecoverInvoiceRequest;
import com.angkor.commerce.invoice.dto.response.InvoiceResponse;
import com.angkor.commerce.invoice.mapper.InvoiceMapper;
import com.angkor.commerce.order.Order;
import com.angkor.commerce.order.OrderRepository;
import com.angkor.commerce.order.OrderStatus;
import com.angkor.commerce.payment.Payment;
import com.angkor.commerce.payment.PaymentMethod;
import com.angkor.commerce.payment.PaymentRepository;
import com.angkor.commerce.payment.PaymentSource;
import com.angkor.commerce.payment.PaymentStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class InvoiceRecoveryServiceImpl implements InvoiceRecoveryService {

    /**
     * SUPER_ADMIN only. Creates the invoice and payment that the
     * automated flow failed to create, for an order whose money did
     * arrive. Deliberately mirrors the gateway path exactly — no
     * custom lines, no custom prices, no editable totals.
     */
    private final InvoiceService invoiceService;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceMapper invoiceMapper;

    @Override
    public InvoiceResponse recover(RecoverInvoiceRequest request, Long staffId) {
        // check order exist?
        Order order = orderRepository
            .findWithItemsById(request.orderId())
            .orElseThrow(() -> new ResourceNotFoundException("Order " + request.orderId() + " was not found"));

        // continue check order status
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ValidationException(
                "Order %s is %s — only a stuck pending order can be recovered".formatted(
                    order.getOrderNumber(),
                    order.getStatus().name().toLowerCase()
                )
            );
        }
        // Confirm the amount recieved
        if (request.amountReceived().compareTo(order.getTotal()) != 0) {
            throw new ValidationException(
                "Recorded amount %s does not match the order total %s. " +
                    "Investigate before recovering.".formatted(request.amountReceived(), order.getTotal())
            );
        }

        // A wallet payment is a ledger debit; staff typing one in would claim money the ledger never moved.
        if (request.paymentMethod() == PaymentMethod.WALLET) {
            throw new ValidationException("WALLET payments come from the wallet ledger and cannot be recorded manually");
        }

        //== recreate Issued Invoice from order
        Invoice invoice = invoiceService.createIssuedInvoiceFromOrder(order);
        // actor id
        invoice.setCreatedBy(staffId); // a human DID do this one
        invoice.setNotes("Manual recovery: " + request.reason());

        // Create new Payment for that

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setSource(PaymentSource.STAFF);
        payment.setAmount(request.amountReceived());
        payment.setCurrency(order.getCurrency());
        payment.setPaymentMethod(request.paymentMethod());
        payment.setPaymentStatus(PaymentStatus.COMPLETED);
        payment.setPaymentDate(request.paymentDate());
        payment.setReferenceNumber(request.referenceNumber());
        payment.setNotes("Manual recovery: " + request.reason());
        payment.setCreatedBy(staffId);

        paymentRepository.save(payment);
        invoice.getPayments().add(payment);

        // Refresh payment status
        invoiceService.refreshPaymentState(invoice);
        order.setStatus(OrderStatus.INVOICED);

        return invoiceMapper.toResponse(invoice);
    }
}
