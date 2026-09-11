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

type Theme = { name:string; version:number; configuration:Record<string,string> };
@ApiTags('Themes') @ApiBearerAuth() @Controller('business/:bid/stores/:storeId/themes')
@UseGuards(JwtAuthGuard, TenantGuard, StoreGuard, RolesGuard) @TenantScoped() @Roles(Role.STAFF)
export class ThemesController {
  constructor(private readonly database:DatabaseService) {}
  @Get() list() { return this.database.query<Theme>("SELECT name,version,configuration FROM theme_definitions WHERE name IN ('simple-light','simple-dark') ORDER BY CASE name WHEN 'simple-light' THEN 1 ELSE 2 END,version DESC"); }
  @Get('current') async current(@Param('bid') bid:string) { const [theme]=await this.database.query<Theme>('SELECT m.theme_name AS name,m.theme_version AS version,m.configuration FROM business_theme_mappings m WHERE m.tenant_id=$1',[bid]); if(theme)return theme; const [fallback]=await this.database.query<Theme>(`SELECT name,version,configuration FROM theme_definitions WHERE name='simple-light' ORDER BY version DESC LIMIT 1`); return fallback; }
  @Patch('current') @Roles(Role.ADMIN) async assign(@Param('bid') bid:string,@Body() body:Theme) { const [definition]=await this.database.query<Theme>('SELECT name,version,configuration FROM theme_definitions WHERE name=$1 AND version=$2',[body.name,body.version]); if(!definition) throw new Error('Theme version was not found'); const configuration=body.configuration ?? definition.configuration; const [theme]=await this.database.query<Theme>('INSERT INTO business_theme_mappings (tenant_id,theme_name,theme_version,configuration) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (tenant_id) DO UPDATE SET theme_name=EXCLUDED.theme_name,theme_version=EXCLUDED.theme_version,configuration=EXCLUDED.configuration,updated_at=NOW() RETURNING theme_name AS name,theme_version AS version,configuration',[bid,definition.name,definition.version,JSON.stringify(configuration)]); return theme; }
}
