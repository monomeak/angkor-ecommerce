package com.angkor.commerce.inventory;

/**
 * Which products the inventory list shows, judged per variant: a product with plenty of M but
 * no XL is out of stock in a way its summed total hides.
 */
public enum StockFilter {
    ALL,
    /** At least one variant at or below the threshold, sold-out ones included. */
    LOW,
    /** At least one variant with nothing left. */
    OUT
}
