import type { AccountStatus, AppRole } from "../../auth/types/auth";

export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  /** Falls back to the username for accounts with no name on file. */
  fullName: string;
  username: string;
  email: string;
  /** Raw MinIO object key — resolve with resolveMediaUrl() before rendering. */
  image: string | null;
  role: AppRole;
  status: AccountStatus;
  createdAt: string;
}

/** Body of POST /users. */
export interface CreateMemberPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  role: AppRole;
}
