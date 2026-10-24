package com.angkor.commerce.invoice;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.common.jsreport.JsReportRenderer;
import com.angkor.commerce.common.jsreport.PdfResponses;
import com.angkor.commerce.invoice.dto.request.InvoiceQueryParams;
import com.angkor.commerce.invoice.dto.response.InvoiceResponse;
import com.angkor.commerce.invoice.dto.response.InvoiceSummaryResponse;
import com.angkor.commerce.security.JwtAuthenticationFilter.AuthenticatedCustomer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.STOREFRONT_BASE + "/invoices")
@RequiredArgsConstructor
@Validated
@Tag(name = "Store-front Invoice")
public class StorefrontInvoiceController {

    private final InvoiceService invoiceService;
    private final JsReportRenderer renderer;

    @GetMapping
    public ResponseEntity<PageResponse<InvoiceSummaryResponse>> getMyInvoices(
        @AuthenticationPrincipal AuthenticatedCustomer customer,
        @Valid InvoiceQueryParams query
    ) {
        return ResponseEntity.ok(invoiceService.getMyInvoices(customer.id(), query));
    }

    @GetMapping("/{invoiceId}")
    public ResponseEntity<InvoiceResponse> getMyInvoice(
        @AuthenticationPrincipal AuthenticatedCustomer customer,
        @PathVariable Long invoiceId
    ) {
        return ResponseEntity.ok(invoiceService.getMyInvoice(customer.id(), invoiceId));
    }

    /** Scoped by the token, like getMyInvoice: another customer's id is a 404, not their PDF. */
    @GetMapping(value = "/{invoiceId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "One of my invoices as a PDF")
    public ResponseEntity<byte[]> getMyInvoicePdf(
        @AuthenticationPrincipal AuthenticatedCustomer customer,
        @PathVariable Long invoiceId
    ) {
        InvoiceResponse invoice = invoiceService.getMyInvoice(customer.id(), invoiceId);
        return PdfResponses.attachment(invoice.invoiceNumber() + ".pdf", renderer.render("document", invoice));
    }
}
