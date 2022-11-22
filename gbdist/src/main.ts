import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const host = process.env.NODE_ENV === 'dev' ? 'localhost' : '0.0.0.0';
  await app.listen(3000, host);
  console.log('[Listening using env]', process.env.NODE_ENV || 'none');
}
bootstrap();
