import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StoreGuard } from '../auth/guards/store.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantScoped } from '../auth/decorators/tenant-scoped.decorator';
import { Role } from '../auth/roles.enum';
import { DatabaseService } from '../database/database.service';

@ApiTags('Catalog variants and media')
@ApiBearerAuth()
@Controller('admin/business/:bid/stores/:storeId/products/:productId')
@UseGuards(JwtAuthGuard, TenantGuard, StoreGuard, RolesGuard)
@TenantScoped()
export class CatalogController {
  constructor(private readonly database: DatabaseService) {}
  private scope(bid: string, storeId: string) { return [bid, storeId]; }

  @Post('options') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Add an option such as Size or Color' })
  @ApiBody({ schema: { type: 'object', required: ['name', 'values'], properties: { name: { type: 'string', example: 'Size' }, values: { type: 'array', items: { type: 'string' } } } } })
  async addOption(@Param('bid') bid: string, @Param('storeId') storeId: string, @Param('productId') productId: string, @Body() body: { name: string; values: string[] }) {
    const optionId = randomUUID();
    await this.database.query('INSERT INTO product_options (id, product_id, name) SELECT $1, id, $2 FROM products WHERE id = $3 AND tenant_id = $4 AND store_id = $5', [optionId, body.name, productId, ...this.scope(bid, storeId)]);
    for (const [position, value] of body.values.entries()) await this.database.query('INSERT INTO product_option_values (id, option_id, value, position) VALUES ($1, $2, $3, $4)', [randomUUID(), optionId, value, position]);
    return this.database.query('SELECT o.id, o.name, o.position, COALESCE(json_agg(v.value ORDER BY v.position) FILTER (WHERE v.id IS NOT NULL), \'[]\') AS values FROM product_options o LEFT JOIN product_option_values v ON v.option_id = o.id WHERE o.id = $1 GROUP BY o.id', [optionId]);
  }

  @Post('variants') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create a SKU with price, stock, and selected option values' })
  @ApiBody({ schema: { type: 'object', required: ['price', 'optionValueIds'], properties: { sku: { type: 'string' }, price: { type: 'number' }, inventoryQuantity: { type: 'integer' }, optionValueIds: { type: 'array', items: { type: 'string', format: 'uuid' } } } } })
  createVariant(@Param('bid') bid: string, @Param('storeId') storeId: string, @Param('productId') productId: string, @Body() body: { sku?: string; price: number; inventoryQuantity?: number; optionValueIds: string[] }) {
    return this.database.query(`INSERT INTO product_variants (id, product_id, tenant_id, store_id, sku, price, inventory_quantity, option_value_ids)
      SELECT $1, id, tenant_id, store_id, $2, $3, $4, $5 FROM products WHERE id = $6 AND tenant_id = $7 AND store_id = $8 RETURNING *`, [randomUUID(), body.sku ?? null, body.price, body.inventoryQuantity ?? 0, body.optionValueIds, productId, bid, storeId]);
  }

  @Get('variants') @ApiOperation({ summary: 'List product variants' })
  variants(@Param('bid') bid: string, @Param('storeId') storeId: string, @Param('productId') productId: string) { return this.database.query('SELECT * FROM product_variants WHERE product_id = $1 AND tenant_id = $2 AND store_id = $3', [productId, bid, storeId]); }

  @Post('images') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Attach object-storage image metadata to a product or variant' })
  @ApiBody({ schema: { type: 'object', required: ['storageKey', 'url'], properties: { storageKey: { type: 'string' }, url: { type: 'string', format: 'uri' }, altText: { type: 'string' }, variantId: { type: 'string', format: 'uuid' } } } })
  addImage(@Param('bid') bid: string, @Param('storeId') storeId: string, @Param('productId') productId: string, @Body() body: { storageKey: string; url: string; altText?: string; variantId?: string }) {
    return this.database.query(`INSERT INTO product_images (id, product_id, variant_id, tenant_id, store_id, storage_key, url, alt_text)
      SELECT $1, id, $2, tenant_id, store_id, $3, $4, $5 FROM products WHERE id = $6 AND tenant_id = $7 AND store_id = $8 RETURNING *`, [randomUUID(), body.variantId ?? null, body.storageKey, body.url, body.altText ?? null, productId, bid, storeId]);
  }

  @Get('images') @ApiOperation({ summary: 'List product gallery and variant images' })
  images(@Param('bid') bid: string, @Param('storeId') storeId: string, @Param('productId') productId: string) { return this.database.query('SELECT * FROM product_images WHERE product_id = $1 AND tenant_id = $2 AND store_id = $3 ORDER BY position', [productId, bid, storeId]); }
}
