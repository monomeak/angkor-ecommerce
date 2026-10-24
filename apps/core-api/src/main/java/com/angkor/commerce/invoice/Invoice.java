package com.angkor.commerce.invoice;

import com.angkor.commerce.common.BaseEntity;
import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.customer.Customer;
import com.angkor.commerce.payment.Payment;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Invoice header. {@code invoiceStatus} is the billing lifecycle (DRAFT..CANCELLED);
 * {@code status} is the unrelated soft-delete flag shared with other business records
 * (see CORE_API_DATA_MODEL.md and the customers/categories/products {@code status} columns).
 */

@NoArgsConstructor
@Entity
@Getter
@Setter
@Table(name = "invoices")
public class Invoice extends BaseEntity {

    @Column(name = "invoice_number", nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    /** Plain Long — the order module stays unimported. Null for manual invoices. */
    @Column(name = "order_id")
    private Long orderId;

    /** The billing lifecycle. */
    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_status", nullable = false, length = 30)
    private InvoiceStatus invoiceStatus = InvoiceStatus.PAID;

    /** The unrelated soft-delete flag shared with other records. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecordStatus status = RecordStatus.ACTIVE;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineNumber ASC")
    private List<InvoiceItem> items = new ArrayList<>();

    /** No cascade — payments are independent financial records. */
    @OneToMany(mappedBy = "invoice", fetch = FetchType.LAZY)
    private List<Payment> payments = new ArrayList<>();

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    /** When the balance reached zero. Reports run on this, not issueDate — see V11. */
    @Column(name = "paid_at")
    private Instant paidAt;

    // ── Money ──────────────────────────────────────────────

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercentage = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "paid_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency = "KHR";

    @Column(name = "total_items", nullable = false)
    private Integer totalItems = 0;

    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    /** Null when the gateway created it — no human did this. */
    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    // ── Helpers ────────────────────────────────────────────
    // Similar to order items
    public void addItem(InvoiceItem item) {
        item.setLineNumber(items.size() + 1);
        items.add(item);
        item.setInvoice(this);
    }

    /**
     * The database enforces balance = total - paid_amount.
     * Call after ANY change to either field.
     */
    public void recalculateBalance() {
        this.balance = total.subtract(paidAmount);
    }
}
