import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((key) => {
    const value = process.env[key] || '';
    return value.length < 32 || value.startsWith('dev-');
  });
  if (weak.length) {
    throw new Error(`Refusing to start in production: set strong values (32+ chars) for ${weak.join(', ')}.`);
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = new Set([
        process.env.WEB_ORIGIN || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]);
      if (allowed.has(origin)) return cb(null, true);
      cb(new Error(`CORS blocked origin: ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(Number(process.env.API_PORT || 4000));
}
bootstrap();
