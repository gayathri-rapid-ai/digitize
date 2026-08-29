import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({ imports: [JwtModule.register({ secret: process.env.CUSTOMER_JWT_SECRET ?? process.env.JWT_SECRET ?? 'development-only-secret', signOptions: { expiresIn: '7d' } })], controllers: [StorefrontController], providers: [StorefrontService] })
export class AppModule {}
