import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantScoped } from '../auth/decorators/tenant-scoped.decorator';
import { Role } from '../auth/roles.enum';
import { DatabaseService } from '../database/database.service';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('admin/business/:bid/stores')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@TenantScoped()
export class StoresController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Roles(Role.STAFF)
  @ApiOperation({ summary: 'List stores belonging to the tenant' })
  list(@Param('tenantId') tenantId: string) {
    return this.database.query('SELECT id, tenant_id AS "tenantId", name, slug, created_at AS "createdAt" FROM stores WHERE tenant_id = $1 ORDER BY created_at', [tenantId]);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a store under the tenant' })
  @ApiBody({ schema: { type: 'object', required: ['name', 'slug'], properties: { name: { type: 'string' }, slug: { type: 'string' } } } })
  async create(@Param('tenantId') tenantId: string, @Body() body: { name: string; slug: string }) {
    const [store] = await this.database.query(
      `INSERT INTO stores (id, tenant_id, name, slug) VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id AS "tenantId", name, slug, created_at AS "createdAt"`,
      [randomUUID(), tenantId, body.name, body.slug],
    );
    return store;
  }
}
