import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AdminController } from './admin.controller';
import { StoresController } from './stores.controller';
import { CatalogController } from './catalog.controller';
import { AdminStoreService } from './admin-store.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminController, StoresController, CatalogController],
  providers: [AdminStoreService],
})
export class AdminModule {}
