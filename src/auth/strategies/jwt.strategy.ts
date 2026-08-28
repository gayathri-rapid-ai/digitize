import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '../authenticated-user.interface';
import { MembershipService } from '../membership.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly memberships: MembershipService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'development-only-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const membership = await this.memberships.findActive(payload.sub, payload.tenantId);
    if (!membership) throw new UnauthorizedException('Tenant membership is no longer active');

    return { id: membership.userId, tenantId: membership.tenantId, role: membership.role };
  }
}
