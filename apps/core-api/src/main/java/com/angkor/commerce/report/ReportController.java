package com.angkor.commerce.report;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.report.dto.response.ReportResponse;
import com.angkor.commerce.security.annotation.IsAdmin;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.REPORTS_BASE)
@RequiredArgsConstructor
@Validated
@Tag(name = "Reports")
public class ReportController {

    /**
     * The decision the guide asks to be written down: the phone column is SUPER_ADMIN only.
     * This report gets exported and emailed around, and a spreadsheet of every customer's phone
     * number is not something a shop admin needs to do their job.
     */
    private static final String PHONE_ROLE = "ROLE_SUPER_ADMIN";

    private final ReportService reportService;

    @GetMapping("/invoices")
    @IsAdmin
    @Operation(summary = "One row per paid invoice, on a cash basis")
    public ResponseEntity<ReportResponse> invoiceReport(
        @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
        @RequestParam(defaultValue = "${angkor.default-currency:USD}") @Pattern(regexp = "^[A-Z]{3}$") String currency,
        Authentication authentication
    ) {
        return ResponseEntity.ok(reportService.invoiceReport(period, currency, canSeePhones(authentication)));
    }

    @GetMapping("/sales-by-category")
    @IsAdmin
    @Operation(summary = "Paid sales grouped by the category snapshotted on each invoice line")
    public ResponseEntity<ReportResponse> salesByCategory(
        @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
        @RequestParam(defaultValue = "${angkor.default-currency:USD}") @Pattern(regexp = "^[A-Z]{3}$") String currency
    ) {
        return ResponseEntity.ok(reportService.salesByCategory(period, currency));
    }

    private static boolean canSeePhones(Authentication authentication) {
        return (
            authentication != null &&
            authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(PHONE_ROLE::equals)
        );
    }
}
