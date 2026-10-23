package com.angkor.commerce.invoice;

import com.angkor.commerce.product.entities.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Line-item snapshot: title/price/sku/thumbnail are captured at invoice time and never
 * change even if the source {@link Product} is later edited or deleted (hence {@code product}
 * being optional with ON DELETE SET NULL at the DB level).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "invoice_items")
@EntityListeners(AuditingEntityListener.class)
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    /** Nullable — FK is ON DELETE SET NULL; manual lines have none. */

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    // ── Snapshots — frozen forever ─────────────────────────
    @Column(length = 100)
    private String sku;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    /** Snapshotted like the title and price: a category rename must not rewrite old reports. */
    @Column(length = 100)
    private String category;

    @Column(nullable = false, length = 50)
    private String unit = "piece";

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal total;

    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(name = "discounted_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal discountedTotal;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false, updatable = false)
    private Instant updatedAt;
}
