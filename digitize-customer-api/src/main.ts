import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  const config = new DocumentBuilder().setTitle('Digitize Customer API').setDescription('Public catalog, customer accounts, and orders').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/public/docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
