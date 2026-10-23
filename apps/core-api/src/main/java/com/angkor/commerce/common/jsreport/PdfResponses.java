package com.angkor.commerce.common.jsreport;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

public final class PdfResponses {

    private PdfResponses() {}

    public static ResponseEntity<byte[]> attachment(String filename, byte[] pdf) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
