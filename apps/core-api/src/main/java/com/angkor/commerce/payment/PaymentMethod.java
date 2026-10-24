package com.angkor.commerce.payment;

public enum PaymentMethod {
    CASH,
    BANK_TRANSFER,
    QR_CODE,
    CARD,
    /** Debited from the customer's stored balance. Only the wallet gateway writes it. */
    WALLET,
    OTHER
}
