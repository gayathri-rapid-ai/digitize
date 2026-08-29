import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { StoreGuard } from '../auth/guards/store.guard';
import { MembershipService } from '../auth/membership.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantScoped } from '../auth/decorators/tenant-scoped.decorator';
import { Role } from '../auth/roles.enum';
import { AdminStoreService, Entity, Resource } from './admin-store.service';

type WriteBody = Record<string, unknown>;
const entityBody = { schema: { type: 'object', additionalProperties: true } };
const memberBody = {
  schema: {
    type: 'object',
    required: ['userId', 'role'],
    properties: { userId: { type: 'string' }, role: { type: 'string', enum: Object.values(Role) } },
  },
};

@ApiTags('Admin console')
@ApiBearerAuth()
@Controller('business/:bid/stores/:storeId')
@UseGuards(JwtAuthGuard, TenantGuard, StoreGuard, RolesGuard)
@TenantScoped()
@Roles(Role.STAFF)
export class AdminController {
  constructor(
    private readonly store: AdminStoreService,
    private readonly memberships: MembershipService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  async dashboard(@Param('tenantId') tenantId: string) {
    const [products, orders, customers] = await Promise.all([
      this.store.list(tenantId, 'products'), this.store.list(tenantId, 'orders'), this.store.list(tenantId, 'customers'),
    ]);
    return {
      products: products.length, orders: orders.length, customers: customers.length,
      pendingOrders: orders.filter((order) => order.status === 'PENDING').length,
    };
  }

  @Get('store')
  @ApiOperation({ summary: 'Get store settings' })
  async storeSettings(@Param('tenantId') tenantId: string) {
    return (await this.store.list(tenantId, 'store-settings'))[0] ?? { tenantId, currency: 'USD', timezone: 'UTC' };
  }

  @Patch('store')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update store settings' })
  @ApiBody(entityBody)
  async updateStoreSettings(@Param('tenantId') tenantId: string, @Body() body: WriteBody) {
    const settings = (await this.store.list(tenantId, 'store-settings'))[0];
    return settings
      ? this.store.update(tenantId, 'store-settings', settings.id, body)
      : this.store.create(tenantId, 'store-settings', body);
  }

  @Get('members')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'List store staff and roles' })
  listMembers(@Param('tenantId') tenantId: string) {
    return this.memberships.findByTenant(tenantId);
  }

  @Post('members')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Invite or assign a store staff member' })
  @ApiBody(memberBody)
  async upsertMember(@Param('tenantId') tenantId: string, @Body() body: { userId: string; role: Role }) {
    await this.memberships.upsert({ userId: body.userId, tenantId, role: body.role, active: true });
    return this.memberships.findActive(body.userId, tenantId);
  }

  @Patch('members/:userId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Change a store staff role or deactivate access' })
  @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string', enum: Object.values(Role) }, active: { type: 'boolean' } } } })
  async updateMember(@Param('tenantId') tenantId: string, @Param('userId') userId: string, @Body() body: Partial<{ role: Role; active: boolean }>) {
    const current = await this.memberships.findActive(userId, tenantId);
    await this.memberships.upsert({ userId, tenantId, role: body.role ?? current?.role ?? Role.STAFF, active: body.active ?? true });
    return this.memberships.findActive(userId, tenantId);
  }

  @Get('products') @ApiOperation({ summary: 'List products' })
  listProducts(@Param('tenantId') tenantId: string) { return this.list(tenantId, 'products'); }
  @Get('products/:id') @ApiOperation({ summary: 'Get a product' })
  getProduct(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.get(tenantId, 'products', id); }
  @Post('products') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create a product' }) @ApiBody(entityBody)
  createProduct(@Param('tenantId') tenantId: string, @Body() body: WriteBody) { return this.create(tenantId, 'products', body); }
  @Patch('products/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Update a product' }) @ApiBody(entityBody)
  updateProduct(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: WriteBody) { return this.update(tenantId, 'products', id, body); }
  @Delete('products/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Delete a product' })
  deleteProduct(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.remove(tenantId, 'products', id); }

  @Get('collections') @ApiOperation({ summary: 'List product collections' })
  listCollections(@Param('tenantId') tenantId: string) { return this.list(tenantId, 'collections'); }
  @Post('collections') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create a product collection' }) @ApiBody(entityBody)
  createCollection(@Param('tenantId') tenantId: string, @Body() body: WriteBody) { return this.create(tenantId, 'collections', body); }
  @Patch('collections/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Update a product collection' }) @ApiBody(entityBody)
  updateCollection(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: WriteBody) { return this.update(tenantId, 'collections', id, body); }
  @Delete('collections/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Delete a product collection' })
  deleteCollection(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.remove(tenantId, 'collections', id); }

  @Get('inventory') @ApiOperation({ summary: 'List inventory items' })
  listInventory(@Param('tenantId') tenantId: string) { return this.list(tenantId, 'inventory'); }
  @Post('inventory') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create an inventory item' }) @ApiBody(entityBody)
  createInventory(@Param('tenantId') tenantId: string, @Body() body: WriteBody) { return this.create(tenantId, 'inventory', body); }
  @Patch('inventory/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Adjust inventory' }) @ApiBody(entityBody)
  updateInventory(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: WriteBody) { return this.update(tenantId, 'inventory', id, body); }

  @Get('customers') @ApiOperation({ summary: 'List customers' })
  listCustomers(@Param('tenantId') tenantId: string) { return this.list(tenantId, 'customers'); }
  @Get('customers/:id') @ApiOperation({ summary: 'Get a customer' })
  getCustomer(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.get(tenantId, 'customers', id); }
  @Post('customers') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create a customer' }) @ApiBody(entityBody)
  createCustomer(@Param('tenantId') tenantId: string, @Body() body: WriteBody) { return this.create(tenantId, 'customers', body); }
  @Patch('customers/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Update a customer' }) @ApiBody(entityBody)
  updateCustomer(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: WriteBody) { return this.update(tenantId, 'customers', id, body); }

  @Get('orders') @ApiOperation({ summary: 'List orders' })
  listOrders(@Param('tenantId') tenantId: string) { return this.list(tenantId, 'orders'); }
  @Get('orders/:id') @ApiOperation({ summary: 'Get an order' })
  getOrder(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.get(tenantId, 'orders', id); }
  @Post('orders') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create an order' }) @ApiBody(entityBody)
  createOrder(@Param('tenantId') tenantId: string, @Body() body: WriteBody) { return this.create(tenantId, 'orders', body); }
  @Patch('orders/:id') @ApiOperation({ summary: 'Update order status, fulfillment, or notes' }) @ApiBody(entityBody)
  updateOrder(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: WriteBody) { return this.update(tenantId, 'orders', id, body); }

  @Get('discounts') @ApiOperation({ summary: 'List discount codes and automatic discounts' })
  listDiscounts(@Param('tenantId') tenantId: string) { return this.list(tenantId, 'discounts'); }
  @Post('discounts') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Create a discount' }) @ApiBody(entityBody)
  createDiscount(@Param('tenantId') tenantId: string, @Body() body: WriteBody) { return this.create(tenantId, 'discounts', body); }
  @Patch('discounts/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Update a discount' }) @ApiBody(entityBody)
  updateDiscount(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: WriteBody) { return this.update(tenantId, 'discounts', id, body); }
  @Delete('discounts/:id') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Delete a discount' })
  deleteDiscount(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.remove(tenantId, 'discounts', id); }

  @Get('analytics')
  @ApiOperation({ summary: 'Get store analytics summary' })
  async analytics(@Param('tenantId') tenantId: string) {
    const [orders, customers, products] = await Promise.all([
      this.store.list(tenantId, 'orders'), this.store.list(tenantId, 'customers'), this.store.list(tenantId, 'products'),
    ]);
    return { orders: orders.length, customers: customers.length, products: products.length };
  }

  private list(tenantId: string, resource: Resource): Promise<Entity[]> { return this.store.list(tenantId, resource); }
  private get(tenantId: string, resource: Resource, id: string): Promise<Entity> { return this.store.get(tenantId, resource, id); }
  private create(tenantId: string, resource: Resource, body: WriteBody): Promise<Entity> { return this.store.create(tenantId, resource, body); }
  private update(tenantId: string, resource: Resource, id: string, body: WriteBody): Promise<Entity> { return this.store.update(tenantId, resource, id, body); }
  private async remove(tenantId: string, resource: Resource, id: string): Promise<{ deleted: true }> { await this.store.remove(tenantId, resource, id); return { deleted: true }; }
}
