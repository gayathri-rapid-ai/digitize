import { Body, Controller, Get, Headers, Param, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
@ApiTags('Public API') @Controller('api/public')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}
  @Get('context') context() { return this.storefront.context(); }
  @Get('products') products() { return this.storefront.products(); }
  @Get('collections') collections() { return this.storefront.collections(); }
  @Get('products/:productId') product(@Param('productId') productId:string) { return this.storefront.product(productId); }
  @Get('media/:id') async media(@Param('id') id:string, @Res() response:any) { const blob=await this.storefront.media(id); response.type(blob.mimeType).send(blob.bytes); }
  @Post('customers/register') @ApiBody({schema:{type:'object',required:['email','password','name'],properties:{email:{type:'string'},password:{type:'string',minLength:8},name:{type:'string'}}}}) register(@Body() body:{email:string;password:string;name:string}) { return this.storefront.register(body); }
  @Post('customers/login') login(@Body() body:{email:string;password:string}) { return this.storefront.login(body); }
  @Get('customers/me') @ApiBearerAuth() me(@Headers('authorization') token?:string) { return this.storefront.account(token); }
  @Get('orders') @ApiBearerAuth() orders(@Headers('authorization') token?:string) { return this.storefront.orders(token); }
  @Post('orders') @ApiBearerAuth() order(@Headers('authorization') token:string|undefined, @Body() body:{items:Array<{productId:string;quantity:number}>;shippingAddress?:Record<string,unknown>}) { return this.storefront.createOrder(token,body); }
  @Post('payments/razorpay/order') @ApiBearerAuth() paymentOrder(@Headers('authorization') token:string|undefined, @Body() body:{items:Array<{productId:string;quantity:number}>;shippingAddress?:Record<string,unknown>}) { return this.storefront.createPaymentOrder(token,body); }
  @Post('payments/razorpay/verify') @ApiBearerAuth() verifyPayment(@Headers('authorization') token:string|undefined, @Body() body:{orderId:string;razorpayOrderId:string;razorpayPaymentId:string;razorpaySignature:string}) { return this.storefront.verifyPayment(token,body); }
  @Post('payments/razorpay/webhook') paymentWebhook(@Headers('x-razorpay-signature') signature:string|undefined, @Req() request:RawBodyRequest<any>) { return this.storefront.processPaymentWebhook(signature,request.rawBody); }
}
