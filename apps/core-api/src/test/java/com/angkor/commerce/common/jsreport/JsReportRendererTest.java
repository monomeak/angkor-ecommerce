package com.angkor.commerce.common.jsreport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.angkor.commerce.common.exception.PdfGenerationException;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class JsReportRendererTest {

    private static final byte[] PDF = "%PDF-1.7 fake".getBytes();

    private MockRestServiceServer server;
    private JsReportRenderer renderer;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
            .baseUrl("http://jsreport:5488")
            .defaultHeaders(h -> h.setBasicAuth("admin", "test-only"));
        server = MockRestServiceServer.bindTo(builder).build();
        renderer = new JsReportRenderer(builder.build());
    }

    @Test
    void postsTheTemplateNameAndDataAndReturnsThePdf() {
        server
            .expect(requestTo("http://jsreport:5488/api/report"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Basic YWRtaW46dGVzdC1vbmx5"))
            .andExpect(content().json("{\"template\":{\"name\":\"document\"},\"data\":{\"invoiceNumber\":\"INV-1\"}}"))
            .andRespond(withSuccess(PDF, MediaType.APPLICATION_PDF));

        assertThat(renderer.render("document", Map.of("invoiceNumber", "INV-1"))).isEqualTo(PDF);
        server.verify();
    }

    @Test
    void aTemplateErrorBecomesPdfGenerationException() {
        server
            .expect(requestTo("http://jsreport:5488/api/report"))
            .andRespond(withBadRequest().body("Error when evaluating engine handlebars: missing helper \"money\""));

        assertThatThrownBy(() -> renderer.render("document", Map.of()))
            .isInstanceOf(PdfGenerationException.class)
            .hasMessage("Could not generate the document");
    }

    @Test
    void anEmptyBodyIsNotADocument() {
        server.expect(requestTo("http://jsreport:5488/api/report")).andRespond(withSuccess());

        assertThatThrownBy(() -> renderer.render("document", Map.of())).isInstanceOf(PdfGenerationException.class);
    }

    @Test
    void anUnreachableRendererBecomesPdfGenerationException() {
        // Port 1 on loopback: nothing listens there, so the connect is refused at once.
        JsReportRenderer offline = new JsReportRenderer(RestClient.builder().baseUrl("http://127.0.0.1:1").build());

        assertThatThrownBy(() -> offline.render("document", Map.of()))
            .isInstanceOf(PdfGenerationException.class)
            .hasMessage("The document service is unavailable");
    }
}
