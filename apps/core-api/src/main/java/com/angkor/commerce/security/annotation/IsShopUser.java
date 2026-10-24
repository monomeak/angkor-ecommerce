package com.angkor.commerce.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.access.prepost.PreAuthorize;

/** Any back-office role. Day-to-day shop work: invoices, customers, catalogue, orders, reports. */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('STAFF', 'SHOP_ADMIN', 'SUPER_ADMIN')")
public @interface IsShopUser {}
