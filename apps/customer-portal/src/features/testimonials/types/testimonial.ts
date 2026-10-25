export type TestimonialStatus = "pending" | "approved" | "rejected";

export type PublicTestimonial = {
    id: number;
    rating: number;
    message: string;
    authorName: string;
    authorImage: string | null;
    createdAt: string;
};

export type PublicTestimonialPage = {
    items: PublicTestimonial[];
    total: number;
};

export type MyTestimonial = {
    id: number;
    rating: number;
    message: string;
    status: TestimonialStatus;
    updatedAt: string;
};

export type SaveTestimonialPayload = {
    rating: number;
    message: string;
};
