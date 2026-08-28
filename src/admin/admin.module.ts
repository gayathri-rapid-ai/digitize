import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AdminController } from './admin.controller';
import { AdminStoreService } from './admin-store.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminController],
  providers: [AdminStoreService],
})
export class AdminModule {}
