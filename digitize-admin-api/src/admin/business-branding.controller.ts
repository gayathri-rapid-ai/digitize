import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { StoreGuard } from '../auth/guards/store.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantScoped } from '../auth/decorators/tenant-scoped.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { DatabaseService } from '../database/database.service';

@ApiTags('Business branding') @ApiBearerAuth() @Controller('business/:bid/stores/:storeId/branding')
@UseGuards(JwtAuthGuard, TenantGuard, StoreGuard, RolesGuard) @TenantScoped() @Roles(Role.STAFF)
export class BusinessBrandingController {
  constructor(private readonly database: DatabaseService) {}
  @Get() async get(@Param('bid') bid:string) { const [branding]=await this.database.query<{logoUrl:string|null;logoStorageKey:string|null}>('SELECT logo_url AS "logoUrl",logo_storage_key AS "logoStorageKey" FROM business_branding WHERE tenant_id=$1',[bid]); return branding ?? { logoUrl:null, logoStorageKey:null }; }
  @Patch() @Roles(Role.ADMIN) async update(@Param('bid') bid:string,@Body() body:{logoUrl?:string;logoStorageKey?:string}) { const [branding]=await this.database.query<{logoUrl:string|null;logoStorageKey:string|null}>('INSERT INTO business_branding (tenant_id,logo_url,logo_storage_key) VALUES ($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE SET logo_url=EXCLUDED.logo_url,logo_storage_key=EXCLUDED.logo_storage_key,updated_at=NOW() RETURNING logo_url AS "logoUrl",logo_storage_key AS "logoStorageKey"',[bid,body.logoUrl??null,body.logoStorageKey??null]); return branding; }
}
