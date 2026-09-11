import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Pool, QueryResultRow } from 'pg';

type Account = { id: string; email: string; name: string; passwordHash: string };
@Injectable()
export class StorefrontService {
  private readonly database = new Pool({ connectionString: process.env.DATABASE_URL });
  constructor(private readonly jwt: JwtService) {}
  async context() { const store = await this.publicStore(); const [branding,mapping,fallback] = await Promise.all([this.query<{logoUrl:string|null}>('SELECT logo_url AS "logoUrl" FROM business_branding WHERE tenant_id=$1',[store.tenantId]),this.query<{name:string;version:number;configuration:Record<string,string>}>('SELECT theme_name AS name,theme_version AS version,configuration FROM business_theme_mappings WHERE tenant_id=$1',[store.tenantId]),this.query<{name:string;version:number;configuration:Record<string,string>}>(`SELECT name,version,configuration FROM theme_definitions WHERE name='simple-light' ORDER BY version DESC LIMIT 1`)]); const theme=mapping[0]??fallback[0]; return { name: store.name, slug: store.slug, theme, logoUrl: branding[0]?.logoUrl ?? null, payments: { razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) } }; }
  async products() {
    const store = await this.publicStore();
    return this.query(`SELECT p.id, p.data, p.created_at AS "createdAt", COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
      FROM products p JOIN stores s ON s.id = p.store_id LEFT JOIN product_images i ON i.product_id = p.id AND i.variant_id IS NULL
      WHERE s.id = $1 AND COALESCE((p.data->>'published')::boolean, TRUE) = TRUE GROUP BY p.id ORDER BY p.created_at DESC`, [store.id]);
  }
  async collections() { const store=await this.publicStore(); return this.query(`SELECT c.id,c.data,COALESCE(json_agg(json_build_object('id',i.id,'url',i.url) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL),'[]') AS images FROM collections c LEFT JOIN collection_images i ON i.collection_id=c.id WHERE c.store_id=$1 AND COALESCE((c.data->>'active')::boolean,TRUE)=TRUE GROUP BY c.id ORDER BY c.created_at DESC`,[store.id]); }
  async product(productId: string) { const store = await this.publicStore(); const products = await this.query<any>(`SELECT p.id, p.data, COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]') AS images FROM products p LEFT JOIN product_images i ON i.product_id=p.id AND i.variant_id IS NULL WHERE p.store_id=$1 AND p.id=$2 AND COALESCE((p.data->>'published')::boolean, TRUE)=TRUE GROUP BY p.id`, [store.id, productId]); if (!products[0]) throw new NotFoundException('Product was not found'); return products[0]; }
  async media(id: string) { const store=await this.publicStore(); const [blob]=await this.query<{bytes:Buffer;mimeType:string}>('SELECT bytes, mime_type AS "mimeType" FROM media_blobs WHERE id=$1 AND store_id=$2',[id,store.id]); if(!blob) throw new NotFoundException('Image was not found'); return blob; }
  async register(input: { email:string; password:string; name:string }) { const id = randomUUID(); try { await this.query('INSERT INTO customer_accounts (id,email,password_hash,name) VALUES ($1,$2,$3,$4)', [id, input.email.trim().toLowerCase(), await hash(input.password, 12), input.name.trim()]); } catch (e: any) { if (e?.code === '23505') throw new ConflictException('An account already exists for this email'); throw e; } return this.token({ id, email: input.email.trim().toLowerCase(), name: input.name.trim() }); }
  async login(input: { email:string; password:string }) { const [account] = await this.query<Account>('SELECT id,email,name,password_hash AS "passwordHash" FROM customer_accounts WHERE email=$1', [input.email.trim().toLowerCase()]); if (!account || !(await compare(input.password, account.passwordHash))) throw new UnauthorizedException('Invalid email or password'); return this.token(account); }
  async account(token?: string) { const payload = this.verify(token); const [account] = await this.query<{id:string;email:string;name:string}>('SELECT id,email,name FROM customer_accounts WHERE id=$1', [payload.sub]); if (!account) throw new UnauthorizedException(); return account; }
  async createOrder(token: string | undefined, body: { items: Array<{ productId: string; quantity: number }>; shippingAddress?: Record<string, unknown> }) { const customer = await this.account(token); if (!body.items?.length) throw new ConflictException('An order needs at least one item'); const store = await this.publicStore(); const id=randomUUID(); const products=await this.query<{id:string;data:Record<string,unknown>}>('SELECT id,data FROM products WHERE store_id=$1 AND id = ANY($2::uuid[])', [store.id, body.items.map(item => item.productId)]); if (products.length !== body.items.length) throw new NotFoundException('One or more products were not found'); const lines=body.items.map(item=>({ ...item, product: products.find(product=>product.id===item.productId)?.data })); await this.query('INSERT INTO orders (id,tenant_id,store_id,data) VALUES ($1,$2,$3,$4::jsonb)', [id,store.tenantId,store.id,JSON.stringify({ customerAccountId: customer.id, customerEmail: customer.email, items: lines, shippingAddress: body.shippingAddress ?? {}, status: 'PENDING' })]); return { id, status: 'PENDING' }; }
  async createPaymentOrder(token:string|undefined, body:{items:Array<{productId:string;quantity:number}>;shippingAddress?:Record<string,unknown>}) {
    const keyId=process.env.RAZORPAY_KEY_ID, keySecret=process.env.RAZORPAY_KEY_SECRET;
    if(!keyId||!keySecret) throw new ServiceUnavailableException('Online payments are not configured');
    const customer=await this.account(token); const store=await this.publicStore(); const orderId=randomUUID();
    const {lines,amount}=await this.orderLines(store.id,body.items);
    const response=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,'Content-Type':'application/json'},body:JSON.stringify({amount,currency:'INR',receipt:orderId,notes:{storeId:store.id,customerAccountId:customer.id}})});
    if(!response.ok) throw new ServiceUnavailableException('The payment provider could not start checkout');
    const provider=await response.json() as {id:string;amount:number;currency:string};
    await this.query('INSERT INTO orders (id,tenant_id,store_id,data) VALUES ($1,$2,$3,$4::jsonb)',[orderId,store.tenantId,store.id,JSON.stringify({customerAccountId:customer.id,customerEmail:customer.email,items:lines,shippingAddress:body.shippingAddress??{},status:'PENDING',paymentStatus:'PENDING'})]);
    await this.query('INSERT INTO payments (order_id,tenant_id,store_id,customer_account_id,provider,provider_order_id,amount,currency,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[orderId,store.tenantId,store.id,customer.id,'razorpay',provider.id,provider.amount,provider.currency,'PENDING']);
    return {orderId,razorpayOrderId:provider.id,keyId,amount:provider.amount,currency:provider.currency,customer:{name:customer.name,email:customer.email}};
  }
  async verifyPayment(token:string|undefined, body:{orderId:string;razorpayOrderId:string;razorpayPaymentId:string;razorpaySignature:string}) {
    const customer=await this.account(token), secret=process.env.RAZORPAY_KEY_SECRET;
    if(!secret) throw new ServiceUnavailableException('Online payments are not configured');
    const [payment]=await this.query<{providerOrderId:string;status:string}>('SELECT provider_order_id AS "providerOrderId",status FROM payments WHERE order_id=$1 AND customer_account_id=$2',[body.orderId,customer.id]);
    if(!payment||payment.providerOrderId!==body.razorpayOrderId) throw new NotFoundException('Payment order was not found');
    const expected=createHmac('sha256',secret).update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`).digest('hex');
    if(!this.matchesSignature(expected,body.razorpaySignature)) throw new BadRequestException('Payment signature is invalid');
    await this.markPayment(body.razorpayOrderId,'PAID',body.razorpayPaymentId);
    return {orderId:body.orderId,status:'PAID'};
  }
  async processPaymentWebhook(signature:string|undefined, rawBody?:Buffer) {
    const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
    if(!secret||!signature||!rawBody) throw new UnauthorizedException('Webhook verification failed');
    const expected=createHmac('sha256',secret).update(rawBody).digest('hex');
    if(!this.matchesSignature(expected,signature)) throw new UnauthorizedException('Webhook signature is invalid');
    const event=JSON.parse(rawBody.toString('utf8')) as {event:string;payload?:{payment?:{entity?:{id?:string;order_id?:string}}}};
    const entity=event.payload?.payment?.entity;
    if(entity?.order_id&&(event.event==='payment.captured'||event.event==='payment.failed')) await this.markPayment(entity.order_id,event.event==='payment.captured'?'PAID':'FAILED',entity.id);
    return {received:true};
  }
  async orders(token?:string) { const customer=await this.account(token); const store=await this.publicStore(); return this.query(`SELECT id,data,created_at AS "createdAt" FROM orders WHERE store_id=$1 AND data->>'customerAccountId'=$2 ORDER BY created_at DESC`,[store.id,customer.id]); }
  private token(account: {id:string;email:string;name:string}) { return { accessToken: this.jwt.sign({ sub: account.id, email: account.email, name: account.name }), customer: { id: account.id, email: account.email, name: account.name } }; }
  private verify(token?: string): {sub:string} { if (!token?.startsWith('Bearer ')) throw new UnauthorizedException('Sign in to place an order'); try { return this.jwt.verify(token.slice(7)); } catch { throw new UnauthorizedException('Your session has expired'); } }
  private async orderLines(storeId:string,items:Array<{productId:string;quantity:number}>) { if(!items?.length) throw new ConflictException('An order needs at least one item'); const ids=[...new Set(items.map(item=>item.productId))]; const products=await this.query<{id:string;data:Record<string,unknown>}>('SELECT id,data FROM products WHERE store_id=$1 AND id = ANY($2::uuid[])',[storeId,ids]); if(products.length!==ids.length) throw new NotFoundException('One or more products were not found'); let amount=0; const lines=items.map(item=>{const quantity=Math.floor(Number(item.quantity));if(!Number.isFinite(quantity)||quantity<1||quantity>99) throw new BadRequestException('Item quantity is invalid');const product=products.find(value=>value.id===item.productId)!;const price=Number(product.data.price);if(!Number.isFinite(price)||price<=0) throw new BadRequestException('Every product needs a valid price');const unitAmount=Math.round(price*100);amount+=unitAmount*quantity;return{productId:item.productId,quantity,unitAmount,product:product.data};}); if(amount<100) throw new BadRequestException('Order total must be at least ₹1'); return{lines,amount}; }
  private matchesSignature(expected:string,received:string) { const a=Buffer.from(expected),b=Buffer.from(received??''); return a.length===b.length&&timingSafeEqual(a,b); }
  private async markPayment(providerOrderId:string,status:'PAID'|'FAILED',providerPaymentId?:string) { const [payment]=await this.query<{orderId:string;status:'PAID'|'FAILED'}>(`UPDATE payments SET status=CASE WHEN status='PAID' THEN 'PAID' ELSE $1 END,provider_payment_id=COALESCE($2,provider_payment_id),updated_at=NOW() WHERE provider_order_id=$3 RETURNING order_id AS "orderId",status`,[status,providerPaymentId??null,providerOrderId]); if(payment) await this.query(`UPDATE orders SET data=jsonb_set(jsonb_set(data,'{paymentStatus}',to_jsonb($1::text),true),'{status}',to_jsonb($2::text),true) WHERE id=$3`,[payment.status,payment.status==='PAID'?'PAID':'PAYMENT_FAILED',payment.orderId]); }
  private async publicStore(): Promise<{ id: string; tenantId: string; name: string; slug: string }> { const storeId = process.env.PUBLIC_STORE_ID?.trim() || null; const storeSlug = process.env.PUBLIC_STORE_SLUG?.trim() || null; const [store] = await this.query<{ id:string; tenantId:string; name:string; slug:string }>(`SELECT id, tenant_id AS "tenantId", name, slug FROM stores WHERE ($1::uuid IS NOT NULL AND id=$1) OR ($1::uuid IS NULL AND $2::text IS NOT NULL AND slug=$2) OR ($1::uuid IS NULL AND $2::text IS NULL) ORDER BY created_at DESC LIMIT 1`, [storeId, storeSlug]); if (!store) throw new NotFoundException('No public store is configured'); return store; }
  private async query<T extends QueryResultRow = QueryResultRow>(sql:string, values:unknown[]=[]): Promise<T[]> { return (await this.database.query<T>(sql, values)).rows; }
}
