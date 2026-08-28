import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { MembershipService } from './membership.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-only-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [MembershipService, AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, TenantGuard],
  exports: [AuthService, MembershipService, JwtAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
