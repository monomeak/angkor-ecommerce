package com.angkor.commerce.common.jsreport;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(JsReportProperties.class)
public class JsReportConfig {

    @Bean
    RestClient jsReportRestClient(RestClient.Builder builder, JsReportProperties props) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
        );
        factory.setReadTimeout(props.timeout());
        return builder
            .baseUrl(props.url())
            .requestFactory(factory)
            .defaultHeaders(h -> h.setBasicAuth(props.username(), props.password()))
            .build();
    }
}
