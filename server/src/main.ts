import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Initialize Sentry as early as possible. No-op when SENTRY_DSN is unset.
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV ?? 'production',
  });
}

/**
 * Apply the shared HTTP setup (helmet, CORS, validation, prefix, swagger).
 * Used by both the local-dev `bootstrap()` and the Vercel serverless handler.
 */
export async function configureApp(app: NestExpressApplication): Promise<NestExpressApplication> {
  const config = app.get(ConfigService);
  const isProd = config.get('NODE_ENV') === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Trust the first proxy hop (Vercel / Railway / nginx) so the throttler
  // sees real client IPs instead of the proxy address.
  if (isProd) {
    app.getHttpAdapter().getInstance().set?.('trust proxy', 1);
  }

  const allowedOrigins = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  if (!isProd) {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('BarberPro API')
      .setDescription('Phase 2 backend — NestJS + Prisma + PostgreSQL')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('api/docs', app, doc);
  }

  return app;
}

/**
 * Create + configure a Nest app on top of an Express instance. The serverless
 * handler passes its own Express so it can wrap it with serverless-express;
 * local dev lets us create one inline.
 */
export async function createApp(expressInstance?: Express): Promise<NestExpressApplication> {
  const adapter = new ExpressAdapter(expressInstance ?? express());
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    bufferLogs: true,
  });
  await configureApp(app);
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 BarberPro API listening on :${port}/api/v1`, 'Bootstrap');
  if (config.get('NODE_ENV') !== 'production') {
    Logger.log(`📘 Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

// Only auto-boot when run as a script (not when imported by the serverless handler).
if (require.main === module) {
  bootstrap();
}
