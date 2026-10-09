import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // Render's proxy: the client IP for the login/sign-up limits
  app.enableCors({ origin: true, exposedHeaders: ['Content-Disposition'] }); // lets the web app read CSV file names
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // 0.0.0.0 so a phone on the same Wi-Fi can reach it
  console.log(`Basa Tayo API running on http://localhost:${port}/api`);
}
bootstrap();
