import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
@ApiTags('Public API') @Controller('api/public')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}
  @Get('context') context() { return this.storefront.context(); }
  @Get('products') products() { return this.storefront.products(); }
  @Get('products/:productId') product(@Param('productId') productId:string) { return this.storefront.product(productId); }
  @Post('customers/register') @ApiBody({schema:{type:'object',required:['email','password','name'],properties:{email:{type:'string'},password:{type:'string',minLength:8},name:{type:'string'}}}}) register(@Body() body:{email:string;password:string;name:string}) { return this.storefront.register(body); }
  @Post('customers/login') login(@Body() body:{email:string;password:string}) { return this.storefront.login(body); }
  @Get('customers/me') @ApiBearerAuth() me(@Headers('authorization') token?:string) { return this.storefront.account(token); }
  @Post('orders') @ApiBearerAuth() order(@Headers('authorization') token:string|undefined, @Body() body:{items:Array<{productId:string;quantity:number}>;shippingAddress?:Record<string,unknown>}) { return this.storefront.createOrder(token,body); }
}
