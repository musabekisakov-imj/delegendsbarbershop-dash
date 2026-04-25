import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // ─── CORS ────────────────────────────────────────────
  // Allow only the listed origins (Vite dev + Vercel prod).
  const allowedOrigins = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── Validation ──────────────────────────────────────
  // Reject any request with extra fields in the body — protects against
  // mass-assignment vulnerabilities.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  // ─── Swagger (dev only) ──────────────────────────────
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('BarberPro API')
      .setDescription('Phase 2 backend — NestJS + Prisma + PostgreSQL')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('api/docs', app, doc);
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 BarberPro API listening on :${port}/api/v1`, 'Bootstrap');
  if (config.get('NODE_ENV') !== 'production') {
    Logger.log(`📘 Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}
bootstrap();
