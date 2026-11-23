import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  digestQueueName,
  syncUserDigestSchedule,
  type DigestScheduleUser,
} from '@libs/shared';
import { Queue } from 'bullmq';

@Injectable()
export class DigestScheduleService {
  constructor(
    @InjectQueue(digestQueueName.name)
    private readonly digestQueue: Queue,
  ) {}

  async sync(user: DigestScheduleUser): Promise<boolean> {
    return syncUserDigestSchedule(this.digestQueue, user);
  }
}
