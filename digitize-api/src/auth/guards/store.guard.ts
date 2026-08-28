import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class StoreGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ params: { tenantId?: string; bid?: string; storeId?: string } }>();
    const tenantId = request.params.tenantId ?? request.params.bid;
    const { storeId } = request.params;
    if (!tenantId || !storeId) throw new ForbiddenException('A tenant and store are required');
    const rows = await this.database.query<{ id: string }>('SELECT id FROM stores WHERE id = $1 AND tenant_id = $2', [storeId, tenantId]);
    if (!rows.length) throw new ForbiddenException('Store does not belong to this tenant');
    return true;
  }
}
