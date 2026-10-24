package com.angkor.commerce.dashboard;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.dashboard.dto.response.DashboardOverviewResponse;
import com.angkor.commerce.security.annotation.IsShopUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.DASHBOARD_BASE)
@RequiredArgsConstructor
@Tag(name = "Dashboard")
public class DashboardController {

    private static final int DEFAULT_MONTHS = 6;

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    @IsShopUser
    @Operation(summary = "KPIs, revenue by month, units sold per category and the latest invoices")
    public ResponseEntity<DashboardOverviewResponse> getOverview(
        @RequestParam(required = false) Integer months
    ) {
        // Clamped rather than validated: a bad ?months= is not worth a 400 on a dashboard.
        int window = months == null ? DEFAULT_MONTHS : Math.clamp(months, 1, 24);

        return ResponseEntity.ok(dashboardService.getOverview(window));
    }
}
