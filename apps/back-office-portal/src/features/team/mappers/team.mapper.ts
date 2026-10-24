import type { TeamMemberDto } from "../schemas/team-api.schema";
import type { TeamMember } from "../types/team";

export function mapToTeamMember(dto: TeamMemberDto): TeamMember {
    const firstName = dto.firstName ?? "";
    const lastName = dto.lastName ?? "";

    return {
        id: dto.id,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim() || dto.username,
        username: dto.username,
        email: dto.email,
        image: dto.image,
        role: dto.role,
        status: dto.status,
        createdAt: dto.createdAt
    };
}
