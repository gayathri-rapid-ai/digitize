import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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

@ApiTags('Collection media') @ApiBearerAuth()
@Controller('business/:bid/stores/:storeId/collections/:collectionId/images')
@UseGuards(JwtAuthGuard, TenantGuard, StoreGuard, RolesGuard) @TenantScoped()
export class CollectionMediaController {
  constructor(private readonly database: DatabaseService) {}
  @Get() @ApiOperation({ summary: 'List collection images' })
  list(@Param('bid') bid:string, @Param('storeId') storeId:string, @Param('collectionId') collectionId:string) { return this.database.query('SELECT * FROM collection_images WHERE collection_id=$1 AND tenant_id=$2 AND store_id=$3 ORDER BY position, created_at', [collectionId,bid,storeId]); }
  @Post() @Roles(Role.ADMIN) @ApiOperation({ summary: 'Attach image metadata to a collection' })
  @ApiBody({ schema: { type:'object', required:['storageKey','url'], properties:{storageKey:{type:'string'},url:{type:'string'},altText:{type:'string'},position:{type:'integer'}} } })
  create(@Param('bid') bid:string, @Param('storeId') storeId:string, @Param('collectionId') collectionId:string, @Body() body:{storageKey:string;url:string;altText?:string;position?:number}) { return this.database.query(`INSERT INTO collection_images (id,collection_id,tenant_id,store_id,storage_key,url,alt_text,position)
    SELECT $1,id,tenant_id,store_id,$2,$3,$4,$5 FROM collections WHERE id=$6 AND tenant_id=$7 AND store_id=$8 RETURNING *`, [randomUUID(),body.storageKey,body.url,body.altText??null,body.position??0,collectionId,bid,storeId]); }
}
