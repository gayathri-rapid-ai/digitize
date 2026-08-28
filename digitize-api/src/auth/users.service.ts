import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { Role } from './roles.enum';

type UserRow = { id: string; email: string; username: string | null; passwordHash: string | null; googleId: string | null; name: string };

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async register(input: { email: string; username: string; password: string; name: string; tenantName: string }): Promise<{ userId: string; tenantId: string; storeId: string }> {
    const userId = randomUUID();
    const tenantId = randomUUID();
    const storeId = randomUUID();
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const slug = `${username}-${tenantId.slice(0, 8)}`;
    try {
      await this.database.query(
        'INSERT INTO users (id, email, username, password_hash, name) VALUES ($1, $2, $3, $4, $5)',
        [userId, email, username, await hash(input.password, 12), input.name.trim()],
      );
      await this.database.query('INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)', [tenantId, input.tenantName.trim(), slug]);
      await this.database.query('INSERT INTO stores (id, tenant_id, name, slug) VALUES ($1, $2, $3, $4)', [storeId, tenantId, input.tenantName.trim(), 'default']);
      await this.database.query('INSERT INTO tenant_memberships (user_id, tenant_id, role, active) VALUES ($1, $2, $3, TRUE)', [userId, tenantId, Role.OWNER]);
      return { userId, tenantId, storeId };
    } catch (error: unknown) {
      // PostgreSQL unique-constraint violation.
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new ConflictException('Username or email is already registered');
      }
      throw error;
    }
  }

  async verifyPassword(usernameOrEmail: string, password: string): Promise<string> {
    const [user] = await this.database.query<UserRow>(
      `SELECT id, email, username, password_hash AS "passwordHash", google_id AS "googleId", name
       FROM users WHERE username = $1 OR email = $1`, [usernameOrEmail.trim().toLowerCase()],
    );
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return user.id;
  }

  async findOrCreateGoogleUser(profile: { id: string; emails?: Array<{ value: string }>; displayName?: string }): Promise<string> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) throw new UnauthorizedException('Google account does not provide an email address');
    const [existing] = await this.database.query<UserRow>(
      `SELECT id, email, username, password_hash AS "passwordHash", google_id AS "googleId", name
       FROM users WHERE google_id = $1 OR email = $2`, [profile.id, email],
    );
    if (existing) {
      if (!existing.googleId) await this.database.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, existing.id]);
      return existing.id;
    }

    const userId = randomUUID();
    const tenantId = randomUUID();
    const storeId = randomUUID();
    const prefix = (email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 20) || 'store').toLowerCase();
    const username = `${prefix}-${userId.slice(0, 8)}`;
    await this.database.query(
      'INSERT INTO users (id, email, username, google_id, name) VALUES ($1, $2, $3, $4, $5)',
      [userId, email, username, profile.id, profile.displayName ?? prefix],
    );
    await this.database.query('INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)', [tenantId, `${profile.displayName ?? prefix}'s store`, `${username}-store`]);
    await this.database.query('INSERT INTO stores (id, tenant_id, name, slug) VALUES ($1, $2, $3, $4)', [storeId, tenantId, `${profile.displayName ?? prefix}'s store`, 'default']);
    await this.database.query('INSERT INTO tenant_memberships (user_id, tenant_id, role, active) VALUES ($1, $2, $3, TRUE)', [userId, tenantId, Role.OWNER]);
    return userId;
  }
}
