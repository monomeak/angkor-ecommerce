package com.angkor.commerce.dashboard.impl;

import com.angkor.commerce.category.Category;
import com.angkor.commerce.category.CategoryRepository;
import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.customer.CustomerRepository;
import com.angkor.commerce.dashboard.DashboardService;
import com.angkor.commerce.dashboard.dto.response.CategorySalesResponse;
import com.angkor.commerce.dashboard.dto.response.DashboardOverviewResponse;
import com.angkor.commerce.dashboard.dto.response.DashboardSummaryResponse;
import com.angkor.commerce.dashboard.dto.response.RecentInvoiceResponse;
import com.angkor.commerce.dashboard.dto.response.RevenuePointResponse;
import com.angkor.commerce.invoice.Invoice;
import com.angkor.commerce.invoice.InvoiceItemRepository;
import com.angkor.commerce.invoice.InvoiceRepository;
import com.angkor.commerce.order.OrderRepository;
import com.angkor.commerce.order.OrderStatus;
import com.angkor.commerce.payment.PaymentRepository;
import com.angkor.commerce.product.repositories.ProductRepository;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    /** Same zone the invoice and payment dates are written in. */
    private static final ZoneId ZONE = ZoneId.of("Asia/Phnom_Penh");

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;

    @Value("${angkor.default-currency:USD}")
    private String defaultCurrency;

    @Override
    public DashboardOverviewResponse getOverview(int months) {
        return new DashboardOverviewResponse(summary(), revenueByMonth(months), salesByCategory(), recentInvoices());
    }

    private DashboardSummaryResponse summary() {
        return new DashboardSummaryResponse(
            zeroIfNull(paymentRepository.sumCompletedPayments()),
            zeroIfNull(invoiceRepository.sumOutstandingBalance()),
            defaultCurrency,
            productRepository.countByStatus(RecordStatus.ACTIVE),
            customerRepository.countByStatus(RecordStatus.ACTIVE),
            orderRepository.countByStatus(OrderStatus.PENDING),
            invoiceRepository.countByStatusNot(RecordStatus.DELETED)
        );
    }

    /**
     * Every month in the window, in order, including the ones nobody paid in — a chart with
     * gaps where a quiet month should be reads as missing data rather than as no sales.
     */
    private List<RevenuePointResponse> revenueByMonth(int months) {
        YearMonth current = YearMonth.now(ZONE);
        YearMonth start = current.minusMonths(months - 1L);

        Map<YearMonth, BigDecimal> totals = new HashMap<>();
        for (Object[] row : paymentRepository.sumCompletedPaymentsByMonth(start.atDay(1))) {
            totals.put(YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue()), toAmount(row[2]));
        }

        List<RevenuePointResponse> series = new ArrayList<>(months);
        for (int offset = 0; offset < months; offset++) {
            YearMonth month = start.plusMonths(offset);
            series.add(new RevenuePointResponse(month.toString(), totals.getOrDefault(month, BigDecimal.ZERO)));
        }

        return series;
    }

    /**
     * Every top-level category is present, including the ones nobody bought from, so the
     * chart's legend and colours stay put as sales move between them. The repository rolls
     * leaf categories up to their root; this fills in the roots it found nothing for.
     */
    private List<CategorySalesResponse> salesByCategory() {
        Map<Long, Object[]> rows = new HashMap<>();
        for (Object[] row : invoiceItemRepository.sumSoldUnitsByRootCategory()) {
            rows.put(((Number) row[0]).longValue(), row);
        }

        List<Category> roots = categoryRepository.findByParentIdIsNullOrderBySortOrderAscNameAsc();
        List<CategorySalesResponse> sales = new ArrayList<>(roots.size());
        for (Category root : roots) {
            Object[] row = rows.get(root.getId());
            sales.add(
                new CategorySalesResponse(
                    root.getId(),
                    root.getName(),
                    root.getSlug(),
                    row == null ? 0L : ((Number) row[3]).longValue(),
                    row == null ? BigDecimal.ZERO : toAmount(row[4])
                )
            );
        }

        return sales;
    }

    private List<RecentInvoiceResponse> recentInvoices() {
        return invoiceRepository
            .findTop5ByStatusNotOrderByIssueDateDescIdDesc(RecordStatus.DELETED)
            .stream()
            .map(DashboardServiceImpl::toRecentInvoice)
            .toList();
    }

    private static RecentInvoiceResponse toRecentInvoice(Invoice invoice) {
        return new RecentInvoiceResponse(
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getCustomer().getId(),
            invoice.getCustomer().getDisplayName(),
            invoice.getInvoiceStatus(),
            invoice.getIssueDate(),
            invoice.getDueDate(),
            invoice.getTotal(),
            invoice.getBalance(),
            invoice.getCurrency()
        );
    }

    /** coalesce() covers an empty table, but a driver returning null would still reach here. */
    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /**
     * `coalesce(sum(x), 0)` is not guaranteed to come back as a BigDecimal — the literal can
     * widen the expression's type, and which numeric type Hibernate hands over depends on the
     * dialect. Casting straight to BigDecimal would be a ClassCastException in production on a
     * query that looks fine in review, so the value is converted through its own text.
     */
    private static BigDecimal toAmount(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
    }
}
