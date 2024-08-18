import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as morgan from 'morgan';
import * as compression from 'compression';

async function bootstrap() {
  // app settings
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // config
  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get<number>('port');

  // Express middleware
  app.use(compression());
  app.use(morgan('dev'));

  await app.listen(port);
}
bootstrap();
