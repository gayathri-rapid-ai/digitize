import { Role } from './roles.enum';

export interface AuthenticatedUser {
  id: string;
  bid: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  bid: string;
}
