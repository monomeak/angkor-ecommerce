package com.angkor.commerce.common.jsreport;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "angkor.jsreport")
@Validated
public record JsReportProperties(
    @NotBlank String url,
    @NotBlank String username,
    @NotBlank String password,
    @NotNull Duration timeout // a Chrome render, not a ping — the first one after boot is slow
) {}
