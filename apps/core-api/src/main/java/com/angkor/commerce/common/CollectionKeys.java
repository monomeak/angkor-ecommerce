package com.angkor.commerce.common;

public final class CollectionKeys {

    // final class no object required, can't be extended
    // static function or var for better memory registration
    /**
     * JSON keys for paginated collection responses.
     *
     * The API returns collections keyed by resource name rather than a
     * generic "data" field, per api-response-design.md:
     *
     * <pre>
     * { "products": [...], "total": 194, "skip": 0, "limit": 30 }
     * </pre>
     *
     * These keys are part of the public API contract — changing one breaks
     * every frontend consuming it.
     */
    private CollectionKeys() {} // can't make object :)

    // ── People ──
    public static final String USERS = "users";
    public static final String CUSTOMERS = "customers";

    // ── Commerce ──
    public static final String ORDERS = "orders";
    public static final String INVOICES = "invoices";
    public static final String PAYMENTS = "payments";

    // ── Operations ──
    public static final String AUDIT_LOGS = "auditLogs";
    public static final String REPORTS = "reports";

    public static final String WISHLIST = "wishlist";
    public static final String TESTIMONIALS = "testimonials";
    public static final String INVENTORY = "inventory";
}
