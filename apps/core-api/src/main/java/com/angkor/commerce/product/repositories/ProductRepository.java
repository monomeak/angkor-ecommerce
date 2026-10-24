package com.angkor.commerce.product.repositories;

import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.product.entities.Product;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    /** Dashboard KPI: how many products are actually on sale. */
    long countByStatus(RecordStatus status);

    @Query("select p from Product p where p.id = :id and p.status <> 'DELETED'")
    Optional<Product> findActiveById(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = { "category" })
    Page<Product> findAll(Specification<Product> spec, Pageable pageable);

    @EntityGraph(attributePaths = { "category" })
    @Query("select p from Product p where p.id = :id and p.status <> 'DELETED'")
    Optional<Product> findActiveWithCategoryId(@Param("id") Long id);

    @EntityGraph(attributePaths = { "category" })
    Optional<Product> findByCategoryId(Long id);

    boolean existsByIdAndStatusNot(Long id, RecordStatus status);

    /**
     * [productId, rootCategoryName] for the ids given — what an invoice line snapshots at the
     * sale. Rolled up to the root the same way the dashboard does, so the two agree on which
     * category a sale belongs to.
     */
    @Query(
        """
        select p.id, root.name
        from Product p
          join p.category leaf
          join Category root on root.id = coalesce(leaf.parentId, leaf.id)
        where p.id in :productIds
        """
    )
    List<Object[]> findRootCategoryNames(@Param("productIds") Collection<Long> productIds);
}
