package com.angkor.commerce.report;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.jsreport.JsReportRenderer;
import com.angkor.commerce.common.jsreport.PdfResponses;
import com.angkor.commerce.report.dto.response.ReportResponse;
import com.angkor.commerce.security.annotation.IsShopUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
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
    private final JsReportRenderer renderer;

    @GetMapping("/invoices")
    @IsShopUser
    @Operation(summary = "One row per paid invoice, on a cash basis")
    public ResponseEntity<ReportResponse> invoiceReport(
        @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
        @RequestParam(defaultValue = "${angkor.default-currency:USD}") @Pattern(regexp = "^[A-Z]{3}$") String currency,
        Authentication authentication
    ) {
        return ResponseEntity.ok(reportService.invoiceReport(period, currency, canSeePhones(authentication)));
    }

    @GetMapping("/sales-by-category")
    @IsShopUser
    @Operation(summary = "Paid sales grouped by the category snapshotted on each invoice line")
    public ResponseEntity<ReportResponse> salesByCategory(
        @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
        @RequestParam(defaultValue = "${angkor.default-currency:USD}") @Pattern(regexp = "^[A-Z]{3}$") String currency
    ) {
        return ResponseEntity.ok(reportService.salesByCategory(period, currency));
    }

    // The /pdf siblings call the same service methods, so the PDF cannot disagree with the screen.

    @GetMapping(value = "/invoices/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @IsShopUser
    @Operation(summary = "The invoice report as a PDF")
    public ResponseEntity<byte[]> invoiceReportPdf(
        @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
        @RequestParam(defaultValue = "${angkor.default-currency:USD}") @Pattern(regexp = "^[A-Z]{3}$") String currency,
        Authentication authentication
    ) {
        return pdf(reportService.invoiceReport(period, currency, canSeePhones(authentication)));
    }

    @GetMapping(value = "/sales-by-category/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @IsShopUser
    @Operation(summary = "Sales by category as a PDF")
    public ResponseEntity<byte[]> salesByCategoryPdf(
        @RequestParam(defaultValue = "THIS_MONTH") ReportPeriod period,
        @RequestParam(defaultValue = "${angkor.default-currency:USD}") @Pattern(regexp = "^[A-Z]{3}$") String currency
    ) {
        return pdf(reportService.salesByCategory(period, currency));
    }

    private ResponseEntity<byte[]> pdf(ReportResponse report) {
        String filename = "%s-%s_%s-%s.pdf".formatted(report.reportType(), report.startDate(), report.endDate(), report.currency());
        return PdfResponses.attachment(filename, renderer.render("report", report));
    }

    private static boolean canSeePhones(Authentication authentication) {
        return (
            authentication != null &&
            authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(PHONE_ROLE::equals)
        );
    }
}
