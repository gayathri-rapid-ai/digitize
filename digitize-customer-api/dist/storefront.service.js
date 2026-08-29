"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcryptjs_1 = require("bcryptjs");
const node_crypto_1 = require("node:crypto");
const pg_1 = require("pg");
let StorefrontService = class StorefrontService {
    jwt;
    database = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    constructor(jwt) {
        this.jwt = jwt;
    }
    async stores() { return this.query('SELECT id, name, slug FROM stores ORDER BY created_at'); }
    async products(storeSlug) {
        return this.query(`SELECT p.id, p.data, p.created_at AS "createdAt", COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
      FROM products p JOIN stores s ON s.id = p.store_id LEFT JOIN product_images i ON i.product_id = p.id AND i.variant_id IS NULL
      WHERE s.slug = $1 AND COALESCE((p.data->>'published')::boolean, TRUE) = TRUE GROUP BY p.id ORDER BY p.created_at DESC`, [storeSlug]);
    }
    async product(storeSlug, productId) { const products = await this.query(`SELECT p.id, p.data, COALESCE(json_agg(json_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text) ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]') AS images FROM products p JOIN stores s ON s.id=p.store_id LEFT JOIN product_images i ON i.product_id=p.id AND i.variant_id IS NULL WHERE s.slug=$1 AND p.id=$2 AND COALESCE((p.data->>'published')::boolean, TRUE)=TRUE GROUP BY p.id`, [storeSlug, productId]); if (!products[0])
        throw new common_1.NotFoundException('Product was not found'); return products[0]; }
    async register(input) { const id = (0, node_crypto_1.randomUUID)(); try {
        await this.query('INSERT INTO customer_accounts (id,email,password_hash,name) VALUES ($1,$2,$3,$4)', [id, input.email.trim().toLowerCase(), await (0, bcryptjs_1.hash)(input.password, 12), input.name.trim()]);
    }
    catch (e) {
        if (e?.code === '23505')
            throw new common_1.ConflictException('An account already exists for this email');
        throw e;
    } return this.token({ id, email: input.email.trim().toLowerCase(), name: input.name.trim() }); }
    async login(input) { const [account] = await this.query('SELECT id,email,name,password_hash AS "passwordHash" FROM customer_accounts WHERE email=$1', [input.email.trim().toLowerCase()]); if (!account || !(await (0, bcryptjs_1.compare)(input.password, account.passwordHash)))
        throw new common_1.UnauthorizedException('Invalid email or password'); return this.token(account); }
    async account(token) { const payload = this.verify(token); const [account] = await this.query('SELECT id,email,name FROM customer_accounts WHERE id=$1', [payload.sub]); if (!account)
        throw new common_1.UnauthorizedException(); return account; }
    async createOrder(token, storeSlug, body) { const customer = await this.account(token); if (!body.items?.length)
        throw new common_1.ConflictException('An order needs at least one item'); const [store] = await this.query('SELECT id, tenant_id AS "tenantId" FROM stores WHERE slug=$1', [storeSlug]); if (!store)
        throw new common_1.NotFoundException('Store was not found'); const id = (0, node_crypto_1.randomUUID)(); const products = await this.query('SELECT id,data FROM products WHERE store_id=$1 AND id = ANY($2::uuid[])', [store.id, body.items.map(item => item.productId)]); if (products.length !== body.items.length)
        throw new common_1.NotFoundException('One or more products were not found'); const lines = body.items.map(item => ({ ...item, product: products.find(product => product.id === item.productId)?.data })); await this.query('INSERT INTO orders (id,tenant_id,store_id,data) VALUES ($1,$2,$3,$4::jsonb)', [id, store.tenantId, store.id, JSON.stringify({ customerAccountId: customer.id, customerEmail: customer.email, items: lines, shippingAddress: body.shippingAddress ?? {}, status: 'PENDING' })]); return { id, status: 'PENDING' }; }
    token(account) { return { accessToken: this.jwt.sign({ sub: account.id, email: account.email, name: account.name }), customer: { id: account.id, email: account.email, name: account.name } }; }
    verify(token) { if (!token?.startsWith('Bearer '))
        throw new common_1.UnauthorizedException('Sign in to place an order'); try {
        return this.jwt.verify(token.slice(7));
    }
    catch {
        throw new common_1.UnauthorizedException('Your session has expired');
    } }
    async query(sql, values = []) { return (await this.database.query(sql, values)).rows; }
};
exports.StorefrontService = StorefrontService;
exports.StorefrontService = StorefrontService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], StorefrontService);
//# sourceMappingURL=storefront.service.js.map