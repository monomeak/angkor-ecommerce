import type { TestimonialDto, TestimonialListDto } from "../schemas/testimonial-api.schema";
import type { Testimonial, TestimonialListResult } from "../types/testimonial";

export function mapTestimonial(dto: TestimonialDto): Testimonial {
    return { ...dto };
}

export function mapTestimonialList(dto: TestimonialListDto): TestimonialListResult {
    return { testimonials: dto.testimonials.map(mapTestimonial), total: dto.total };
}
