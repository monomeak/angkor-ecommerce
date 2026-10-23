package com.angkor.commerce.wallet;


import com.angkor.commerce.payment.PaymentMethod;
import com.angkor.commerce.payment.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class WalletPaymentGatewayAdapter implements PaymentGatewayPort {
    public static final String PROVIDER = "WALLET";
    private final  WalletTransactionRepository txnRepository;


    @Override
    public String providerCode() {
        return PROVIDER;
    }


    /**
     * Nothing external to call. No QR, no deeplink — the storefront
     * sees a null qrPayload and shows a "Pay with balance" button that
     * hits /wallet-confirm instead of rendering a QR.
     */

    @Override
    public GatewayIntent createIntent(GatewayIntentRequest request) {
        return new GatewayIntent(null, null, Instant.now().plus(request.validFor()));
    }


    /**
     * "Was this paid?" — for ABA the answer comes from PayWay; for the
     * wallet it comes from our own ledger. A debit row against this
     * intent IS the proof of payment, and uq_wallet_txn_intent
     * guarantees there is at most one.
     */
    @Override
    public GatewayStatusResult checkStatus(String reference) {
        return txnRepository.findByIntentReference(reference).map(txn -> new GatewayStatusResult(GatewayStatus.SUCCEEDED, txn.getAmount(), txn.getWallet().getCurrency(),"WALLET-"+txn.getId())).orElse( new GatewayStatusResult(GatewayStatus.PENDING, null, null,null));
    }

    @Override
    public PaymentMethod paymentMethod() {
        return PaymentMethod.WALLET;
    }
}
