import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Включаем CORS для обычных HTTP-запросов
  app.enableCors({
    origin: '*',
  });

  await app.listen(3001);
  console.log(`🚀 Server is running on: ${await app.getUrl()}`);
}
bootstrap();
