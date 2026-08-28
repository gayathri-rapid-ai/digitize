import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembershipService } from './membership.service';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly memberships: MembershipService,
    private readonly users: UsersService,
  ) {}

  /** Issues a tenant-bound JWT only for an active tenant membership. */
  async issueAccessToken(userId: string, businessId: string): Promise<{ accessToken: string }> {
    const membership = await this.memberships.findActive(userId, businessId);
    if (!membership) {
      throw new ForbiddenException('User is not an active member of this business');
    }

    return { accessToken: await this.jwt.signAsync({ sub: userId, bid: businessId }) };
  }

  async passwordLogin(usernameOrEmail: string, password: string): Promise<{ accessToken: string }> {
    const userId = await this.users.verifyPassword(usernameOrEmail, password);
    const membership = await this.memberships.findFirstActive(userId);
    if (!membership) throw new ForbiddenException('User is not an active member of this business');
    return this.issueAccessToken(userId, membership.tenantId);
  }

  async googleLogin(userId: string, tenantId?: string): Promise<{ accessToken: string }> {
    const membership = tenantId
      ? await this.memberships.findActive(userId, tenantId)
      : await this.memberships.findFirstActive(userId);
    if (!membership) throw new ForbiddenException('User is not an active member of this tenant');
    return this.issueAccessToken(userId, membership.tenantId);
  }
}
