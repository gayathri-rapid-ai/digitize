import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { UsersService } from '../users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly users: UsersService) {
    super({
      // Empty values from Docker Compose must not prevent password authentication
      // from starting when Google SSO is intentionally not configured.
      clientID: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/business/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: { id: string; emails?: Array<{ value: string }>; displayName?: string }) {
    return { id: await this.users.findOrCreateGoogleUser(profile) };
  }
}
