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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const storefront_service_1 = require("./storefront.service");
let StorefrontController = class StorefrontController {
    storefront;
    constructor(storefront) {
        this.storefront = storefront;
    }
    context() { return this.storefront.context(); }
    products() { return this.storefront.products(); }
    product(productId) { return this.storefront.product(productId); }
    register(body) { return this.storefront.register(body); }
    login(body) { return this.storefront.login(body); }
    me(token) { return this.storefront.account(token); }
    order(token, body) { return this.storefront.createOrder(token, body); }
};
exports.StorefrontController = StorefrontController;
__decorate([
    (0, common_1.Get)('context'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "context", null);
__decorate([
    (0, common_1.Get)('products'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "products", null);
__decorate([
    (0, common_1.Get)('products/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "product", null);
__decorate([
    (0, common_1.Post)('customers/register'),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } } } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('customers/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('customers/me'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StorefrontController.prototype, "order", null);
exports.StorefrontController = StorefrontController = __decorate([
    (0, swagger_1.ApiTags)('Public API'),
    (0, common_1.Controller)('api/public'),
    __metadata("design:paramtypes", [storefront_service_1.StorefrontService])
], StorefrontController);
//# sourceMappingURL=storefront.controller.js.map