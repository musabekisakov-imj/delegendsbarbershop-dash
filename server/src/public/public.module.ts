import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

// EmailModule is @Global() — no need to import it here.
@Module({
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
