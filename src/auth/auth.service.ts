import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembershipService } from './membership.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly memberships: MembershipService,
  ) {}

  /** Issues a tenant-bound JWT only for an active tenant membership. */
  async issueAccessToken(userId: string, tenantId: string): Promise<{ accessToken: string }> {
    const membership = await this.memberships.findActive(userId, tenantId);
    if (!membership) {
      throw new ForbiddenException('User is not an active member of this tenant');
    }

    return { accessToken: await this.jwt.signAsync({ sub: userId, tenantId }) };
  }
}
