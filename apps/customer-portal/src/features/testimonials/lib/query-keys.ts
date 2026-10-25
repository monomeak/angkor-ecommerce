export const testimonialKeys = {
    all: ["testimonials"] as const,
    published: (limit: number) => [...testimonialKeys.all, "published", limit] as const,
    mine: () => [...testimonialKeys.all, "mine"] as const
};
