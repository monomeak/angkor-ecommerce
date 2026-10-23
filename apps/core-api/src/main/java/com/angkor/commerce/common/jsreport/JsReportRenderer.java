package com.angkor.commerce.common.jsreport;

import com.angkor.commerce.common.exception.PdfGenerationException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * One renderer for every document: the template name is the only variable. The caller has
 * already authorised and scoped {@code data} — jsreport has no idea who is signed in.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JsReportRenderer {

    private final RestClient jsReportRestClient;

    public byte[] render(String template, Object data) {
        try {
            byte[] pdf = jsReportRestClient
                .post()
                .uri("/api/report")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_PDF)
                .body(Map.of("template", Map.of("name", template), "data", data))
                .retrieve()
                .body(byte[].class);
            if (pdf == null || pdf.length == 0) {
                throw new PdfGenerationException("The document service returned an empty document");
            }
            return pdf;
        } catch (RestClientResponseException ex) {
            // jsreport puts the template's stack trace in a 400 body; without it a broken
            // helper surfaces as "render failed" and nothing else.
            log.error("jsreport render failed [{}] {} {}", template, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new PdfGenerationException("Could not generate the document", ex);
        } catch (ResourceAccessException ex) {
            log.error("jsreport unreachable [{}]", template, ex);
            throw new PdfGenerationException("The document service is unavailable", ex);
        }
    }
}
