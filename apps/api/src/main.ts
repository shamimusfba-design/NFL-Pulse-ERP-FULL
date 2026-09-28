import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
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
