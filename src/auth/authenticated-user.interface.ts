import { Role } from './roles.enum';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
}
