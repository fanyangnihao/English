import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { digestQueueName } from '@libs/shared';
import { DigestScheduleService } from './digest-schedule.service';
@Module({
  controllers: [UserController],
  providers: [UserService, DigestScheduleService],
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: digestQueueName.name,
    }),
  ],
})
export class UserModule {}
