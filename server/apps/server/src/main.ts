import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Config } from '@en/config';
import { InterceptorInterceptor } from '@libs/shared/interceptor/interceptor';
import { InterceptorExceptionFilter } from '@libs/shared/interceptor/exceptionFilter';
import { VersioningType } from '@nestjs/common';
import type {} from 'multer';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //设置全局前缀
  app.setGlobalPrefix('/api');
  //设置版本号v1
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalInterceptors(new InterceptorInterceptor()); //全局拦截器
  app.useGlobalFilters(new InterceptorExceptionFilter()); //全局异常过滤器
  await app.listen(Config.ports.server); //启动服务
}
bootstrap();
