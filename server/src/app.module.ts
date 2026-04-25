import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — 100 req per minute per IP by default.
    // Auth endpoints have stricter limits applied locally.
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 100 },
    ]),

    // Domain modules
    PrismaModule,
    AuthModule,
    EmailModule,
    AppointmentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
