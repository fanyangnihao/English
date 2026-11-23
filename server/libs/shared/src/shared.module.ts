import { Module, Global } from '@nestjs/common';
import { SharedService } from './shared.service';
import { PrismaModule } from './prisma/prisma.module';
import { ResponseModule } from './response/response.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioModule } from './minio/minio.module';
import { PayModule } from './pay/pay.module';
import { EmailModule } from './email/email.module';
import { BullModule } from '@nestjs/bullmq';
@Global()
@Module({
  providers: [SharedService],
  exports: [
    SharedService,
    PrismaModule,
    ResponseModule,
    JwtModule,
    ConfigModule,
    MinioModule,
    PayModule,
    EmailModule,
  ],
  imports: [
    PrismaModule,
    ResponseModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = Number(configService.get<string>('REDIS_PORT'));

        if (!host) {
          throw new Error('REDIS_HOST is not configured');
        }
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('REDIS_PORT must be a valid TCP port');
        }

        return {
          connection: {
            host,
            port,
          },
        };
      },
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('SECRET_KEY'),
        signOptions: { expiresIn: '10h' },
      }),
      inject: [ConfigService],
    }),
    MinioModule,
    PayModule,
    EmailModule,
  ],
})
export class SharedModule {}
