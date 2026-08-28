import { SetMetadata } from '@nestjs/common';

export const TENANT_SCOPED_KEY = 'tenant-scoped';

/** Marks a handler as operating on a tenant id supplied by the request. */
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
