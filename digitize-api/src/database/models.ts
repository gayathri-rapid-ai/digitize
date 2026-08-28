import { Role } from '../auth/roles.enum';

export interface TenantModel { id: string; name: string; slug: string; createdAt: Date; }
export interface StoreModel { id: string; tenantId: string; name: string; slug: string; createdAt: Date; }
export interface UserModel { id: string; email: string; name: string; createdAt: Date; }
export interface TenantMembershipModel { userId: string; tenantId: string; role: Role; active: boolean; }
export interface StoreSettingsModel { id: string; tenantId: string; settings: Record<string, unknown>; }
export interface ProductModel { id: string; tenantId: string; data: Record<string, unknown>; }
export interface CollectionModel { id: string; tenantId: string; data: Record<string, unknown>; }
export interface InventoryItemModel { id: string; tenantId: string; data: Record<string, unknown>; }
export interface CustomerModel { id: string; tenantId: string; data: Record<string, unknown>; }
export interface OrderModel { id: string; tenantId: string; data: Record<string, unknown>; }
export interface DiscountModel { id: string; tenantId: string; data: Record<string, unknown>; }
