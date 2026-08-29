import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Pool, QueryResultRow } from 'pg';

type Account = { id: string; email: string; name: string; passwordHash: string };
@Injectable()
export class StorefrontService {
  private readonly database = new Pool({ connectionString: process.env.DATABASE_URL });
  constructor(private readonly jwt: JwtService) {}
  async stores() { return this.query<{ id:string; name:string; slug:string }>('SELECT id, name, slug FROM stores ORDER BY created_at'); }
  async products(storeSlug: string) {
    return this.query(`SELECT p.id, p.data, p.created_at AS "createdAt", COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
      FROM products p JOIN stores s ON s.id = p.store_id LEFT JOIN product_images i ON i.product_id = p.id AND i.variant_id IS NULL
      WHERE s.slug = $1 AND COALESCE((p.data->>'published')::boolean, TRUE) = TRUE GROUP BY p.id ORDER BY p.created_at DESC`, [storeSlug]);
  }
  async product(storeSlug: string, productId: string) { const products = await this.query<any>(`SELECT p.id, p.data, COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]') AS images FROM products p JOIN stores s ON s.id=p.store_id LEFT JOIN product_images i ON i.product_id=p.id AND i.variant_id IS NULL WHERE s.slug=$1 AND p.id=$2 AND COALESCE((p.data->>'published')::boolean, TRUE)=TRUE GROUP BY p.id`, [storeSlug, productId]); if (!products[0]) throw new NotFoundException('Product was not found'); return products[0]; }
  async register(input: { email:string; password:string; name:string }) { const id = randomUUID(); try { await this.query('INSERT INTO customer_accounts (id,email,password_hash,name) VALUES ($1,$2,$3,$4)', [id, input.email.trim().toLowerCase(), await hash(input.password, 12), input.name.trim()]); } catch (e: any) { if (e?.code === '23505') throw new ConflictException('An account already exists for this email'); throw e; } return this.token({ id, email: input.email.trim().toLowerCase(), name: input.name.trim() }); }
  async login(input: { email:string; password:string }) { const [account] = await this.query<Account>('SELECT id,email,name,password_hash AS "passwordHash" FROM customer_accounts WHERE email=$1', [input.email.trim().toLowerCase()]); if (!account || !(await compare(input.password, account.passwordHash))) throw new UnauthorizedException('Invalid email or password'); return this.token(account); }
  async account(token?: string) { const payload = this.verify(token); const [account] = await this.query<{id:string;email:string;name:string}>('SELECT id,email,name FROM customer_accounts WHERE id=$1', [payload.sub]); if (!account) throw new UnauthorizedException(); return account; }
  async createOrder(token: string | undefined, storeSlug: string, body: { items: Array<{ productId: string; quantity: number }>; shippingAddress?: Record<string, unknown> }) { const customer = await this.account(token); if (!body.items?.length) throw new ConflictException('An order needs at least one item'); const [store] = await this.query<{id:string;tenantId:string}>('SELECT id, tenant_id AS "tenantId" FROM stores WHERE slug=$1', [storeSlug]); if (!store) throw new NotFoundException('Store was not found'); const id=randomUUID(); const products=await this.query<{id:string;data:Record<string,unknown>}>('SELECT id,data FROM products WHERE store_id=$1 AND id = ANY($2::uuid[])', [store.id, body.items.map(item => item.productId)]); if (products.length !== body.items.length) throw new NotFoundException('One or more products were not found'); const lines=body.items.map(item=>({ ...item, product: products.find(product=>product.id===item.productId)?.data })); await this.query('INSERT INTO orders (id,tenant_id,store_id,data) VALUES ($1,$2,$3,$4::jsonb)', [id,store.tenantId,store.id,JSON.stringify({ customerAccountId: customer.id, customerEmail: customer.email, items: lines, shippingAddress: body.shippingAddress ?? {}, status: 'PENDING' })]); return { id, status: 'PENDING' }; }
  private token(account: {id:string;email:string;name:string}) { return { accessToken: this.jwt.sign({ sub: account.id, email: account.email, name: account.name }), customer: { id: account.id, email: account.email, name: account.name } }; }
  private verify(token?: string): {sub:string} { if (!token?.startsWith('Bearer ')) throw new UnauthorizedException('Sign in to place an order'); try { return this.jwt.verify(token.slice(7)); } catch { throw new UnauthorizedException('Your session has expired'); } }
  private async query<T extends QueryResultRow = QueryResultRow>(sql:string, values:unknown[]=[]): Promise<T[]> { return (await this.database.query<T>(sql, values)).rows; }
}
