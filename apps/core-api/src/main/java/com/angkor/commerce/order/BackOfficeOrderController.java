package com.angkor.commerce.order;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.order.dto.request.OrderQueryParams;
import com.angkor.commerce.order.dto.request.UpdateOrderStatusRequest;
import com.angkor.commerce.order.dto.response.OrderResponse;
import com.angkor.commerce.order.dto.response.OrderSummaryResponse;
import com.angkor.commerce.security.annotation.IsShopUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.ORDER_BASE)
@RequiredArgsConstructor
@Validated
@Tag(name = " Orders (Back Office)")
public class BackOfficeOrderController {

    private final OrderService orderService;

    @GetMapping
    @IsShopUser
    @Operation(summary = "List all orders")
    public ResponseEntity<PageResponse<OrderSummaryResponse>> getOrders(@Valid OrderQueryParams query) {
        return ResponseEntity.ok(orderService.getOrders(query));
    }

    @GetMapping("/{orderId}")
    @IsShopUser
    @Operation(summary = "Get any order")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getOrder(orderId));
    }

    @PatchMapping("/{orderId}/status")
    @IsShopUser
    @Operation(summary = "Change order status")
    public ResponseEntity<OrderResponse> updateStatus(
        @PathVariable Long orderId,
        @Valid @RequestBody UpdateOrderStatusRequest request
    ) {
        return ResponseEntity.ok(orderService.updateStatus(orderId, request));
    }
}
