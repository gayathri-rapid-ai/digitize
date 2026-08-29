import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StoreGuard } from '../auth/guards/store.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantScoped } from '../auth/decorators/tenant-scoped.decorator';
import { Role } from '../auth/roles.enum';
import { DatabaseService } from '../database/database.service';

@ApiTags('Local media') @ApiBearerAuth() @Controller('business/:bid/stores/:storeId/media')
@UseGuards(JwtAuthGuard, TenantGuard, StoreGuard, RolesGuard) @TenantScoped() @Roles(Role.ADMIN)
export class LocalMediaController {
  constructor(private readonly database: DatabaseService) {}
  @Post() @ApiOperation({ summary: 'Store an image in the local PostgreSQL blob store' })
  @ApiBody({ schema:{type:'object',required:['filename','mimeType','base64'],properties:{filename:{type:'string'},mimeType:{type:'string'},base64:{type:'string'}}} })
  async upload(@Param('bid') bid:string,@Param('storeId') storeId:string,@Body() body:{filename:string;mimeType:string;base64:string}) {
    if (!body.mimeType.startsWith('image/')) throw new Error('Only image files are supported');
    const id=randomUUID(); const bytes=Buffer.from(body.base64.replace(/^data:[^;]+;base64,/,''),'base64');
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller');
    await this.database.query('INSERT INTO media_blobs (id,tenant_id,store_id,filename,mime_type,bytes) VALUES ($1,$2,$3,$4,$5,$6)',[id,bid,storeId,body.filename,body.mimeType,bytes]);
    return { storageKey:id, url:`/api/public/media/${id}` };
  }
}
