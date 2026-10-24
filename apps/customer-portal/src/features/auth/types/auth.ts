/** Which form the shared auth view renders. */
export type AuthMode = "login" | "signup";

/** Mirrors core-api's AuthenticatedCustomerResponse (login/register payload). */
export type AuthCustomer = {
    id: number;
    displayName: string | null;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string;
    phone: string | null;
};

/** Mirrors core-api's CurrentCustomerResponse (GET/PATCH /me). `image` is an object key. */
export type CurrentCustomer = AuthCustomer & {
    image: string | null;
    status: string;
};

export type LoginPayload = {
    email: string;
    password: string;
};

export type RegisterPayload = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

export type UpdateProfilePayload = {
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    phone?: string;
    image?: string;
};

/** Body of PUT /storefront/auth/me/password. */
export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}
