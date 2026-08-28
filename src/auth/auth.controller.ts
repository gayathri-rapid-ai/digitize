import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

const registerBody = {
  schema: { type: 'object', required: ['email', 'username', 'password', 'ownerName', 'businessName'], properties: {
    email: { type: 'string', format: 'email' }, username: { type: 'string', example: 'merchant' },
    password: { type: 'string', format: 'password', minLength: 8 }, ownerName: { type: 'string' }, businessName: { type: 'string' },
  } },
};
const loginBody = {
  schema: { type: 'object', required: ['username', 'password'], properties: {
    username: { type: 'string', description: 'Username or email address' }, password: { type: 'string', format: 'password' },
  } },
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an owner account and its first store' })
  @ApiBody(registerBody)
  async register(@Body() body: { email: string; username: string; password: string; ownerName: string; businessName: string }) {
    const { userId, tenantId, storeId } = await this.users.register({ ...body, name: body.ownerName, tenantName: body.businessName });
    return { ...(await this.auth.issueAccessToken(userId, tenantId)), bid: tenantId, storeId };
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in with username/email and password' })
  @ApiBody(loginBody)
  async login(@Body() body: { username: string; password: string }) {
    return this.auth.passwordLogin(body.username, body.password);
  }

  @Get('google')
  @ApiOperation({ summary: 'Start Google SSO login' })
  @UseGuards(AuthGuard('google'))
  google() { /* Passport redirects to Google. */ }

  @Get('google/callback')
  @ApiOperation({ summary: 'Complete Google SSO login and return an access token' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Choose one tenant when the account belongs to multiple stores' })
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() request: { user: { id: string } }, @Query('tenantId') tenantId?: string) {
    return this.auth.googleLogin(request.user.id, tenantId);
  }
}
