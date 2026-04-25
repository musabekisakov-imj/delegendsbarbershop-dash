import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';

@Module({
  imports: [PassportModule],
  controllers: [OfficesController],
  providers: [OfficesService],
  exports: [OfficesService],
})
export class OfficesModule {}
