package com.angkor.commerce.wallet;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.security.JwtAuthenticationFilter.AuthenticatedUser;
import com.angkor.commerce.security.annotation.IsShopUser;
import com.angkor.commerce.wallet.dto.request.WalletQueryParams;
import com.angkor.commerce.wallet.dto.request.WalletResponse;
import com.angkor.commerce.wallet.dto.request.WalletTopUpRequest;
import com.angkor.commerce.wallet.dto.response.WalletTransactionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
// wallet/BackOfficeWalletController.java

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_BASE + "/customers/{customerId}/wallet")
@RequiredArgsConstructor
@Validated
@Tag(name = "Wallets (Back office)")
public class BackOfficeWalletController {

    private final WalletService walletService;

    @GetMapping
    @IsShopUser
    public ResponseEntity<WalletResponse> getWallet(
        @PathVariable Long customerId,
        @RequestParam(defaultValue = "USD") String currency
    ) {
        return ResponseEntity.ok(walletService.getWallet(customerId, currency));
    }

    @GetMapping("/transactions")
    @IsShopUser
    public ResponseEntity<PageResponse<WalletTransactionResponse>> getTransactions(
        @PathVariable Long customerId,
        @RequestParam(defaultValue = "USD") String currency,
        @Valid WalletQueryParams query
    ) {
        return ResponseEntity.ok(walletService.getTransactions(customerId, currency, query));
    }

    @PostMapping("/topup")
    @PreAuthorize("hasRole('SUPER_ADMIN')") // narrower than @IsShopUser
    @Operation(summary = "Credit a customer's wallet")
    public ResponseEntity<WalletTransactionResponse> topUp(
        @AuthenticationPrincipal AuthenticatedUser staff,
        @PathVariable Long customerId,
        @RequestBody @Valid WalletTopUpRequest request
    ) {
        return ResponseEntity.ok(walletService.topUp(customerId, request, staff.id()));
    }
}
