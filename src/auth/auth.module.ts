import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { StoreGuard } from './guards/store.guard';
import { MembershipService } from './membership.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersService } from './users.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-only-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [MembershipService, UsersService, AuthService, JwtStrategy, GoogleStrategy, JwtAuthGuard, RolesGuard, TenantGuard, StoreGuard],
  exports: [AuthService, MembershipService, UsersService, JwtAuthGuard, RolesGuard, TenantGuard, StoreGuard],
})
export class AuthModule {}
