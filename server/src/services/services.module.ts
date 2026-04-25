import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [PassportModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
