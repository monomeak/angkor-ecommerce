package com.angkor.commerce.invoice;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.common.jsreport.JsReportRenderer;
import com.angkor.commerce.common.jsreport.PdfResponses;
import com.angkor.commerce.invoice.dto.request.InvoiceQueryParams;
import com.angkor.commerce.invoice.dto.request.RecoverInvoiceRequest;
import com.angkor.commerce.invoice.dto.response.InvoiceResponse;
import com.angkor.commerce.invoice.dto.response.InvoiceSummaryResponse;
import com.angkor.commerce.security.JwtAuthenticationFilter.AuthenticatedUser;
import com.angkor.commerce.security.annotation.IsShopUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.INVOICES_BASE)
@RequiredArgsConstructor
@Validated
@Tag(name = "Invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceRecoveryService recoveryService;
    private final JsReportRenderer renderer;

    @GetMapping
    @IsShopUser
    public ResponseEntity<PageResponse<InvoiceSummaryResponse>> getInvoices(@Valid InvoiceQueryParams query) {
        return ResponseEntity.ok(invoiceService.getInvoices(query));
    }

    @GetMapping("/{invoiceId}")
    @IsShopUser
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(invoiceService.getInvoice(invoiceId));
    }

    @GetMapping(value = "/{invoiceId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @IsShopUser
    @Operation(summary = "The invoice as a PDF")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable Long invoiceId) {
        InvoiceResponse invoice = invoiceService.getInvoice(invoiceId);
        return PdfResponses.attachment(invoice.invoiceNumber() + ".pdf", renderer.render("document", invoice));
    }

    @PostMapping("/recover")
    @PreAuthorize("hasRole('SUPER_ADMIN')") // narrower than @IsShopUser
    @Operation(summary = "Recover an order whose payment succeeded but was not invoiced")
    public ResponseEntity<InvoiceResponse> recover(
        @AuthenticationPrincipal AuthenticatedUser staff,
        @RequestBody @Valid RecoverInvoiceRequest request
    ) {
        return ResponseEntity.ok(recoveryService.recover(request, staff.id()));
    }
}
