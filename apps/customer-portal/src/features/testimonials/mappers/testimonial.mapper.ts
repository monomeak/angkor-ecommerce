import type {
    MyTestimonialDto,
    PublicTestimonialDto,
    PublicTestimonialPageDto
} from "../schemas/testimonial-api.schema";
import type { MyTestimonial, PublicTestimonial, PublicTestimonialPage } from "../types/testimonial";

export function mapPublicTestimonial(dto: PublicTestimonialDto): PublicTestimonial {
    return { ...dto };
}

export function mapPublicTestimonialPage(dto: PublicTestimonialPageDto): PublicTestimonialPage {
    return { items: dto.testimonials.map(mapPublicTestimonial), total: dto.total };
}

export function mapMyTestimonial(dto: MyTestimonialDto): MyTestimonial {
    return {
        id: dto.id,
        rating: dto.rating,
        message: dto.message,
        status: dto.status,
        updatedAt: dto.updatedAt
    };
}
