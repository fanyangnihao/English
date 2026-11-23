import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { digestQueueName } from './digest.queue';
import { DigestService } from './digest.service';
import { EmailService } from '@libs/shared';

//邮件队列消费者
@Processor(digestQueueName.name)
export class DigestProcessor extends WorkerHost {
  constructor(
    private readonly digestService: DigestService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === digestQueueName.task.emailDigest) {
      const userId = job.data?.userId;
      if (typeof userId !== 'string' || !userId) {
        throw new Error('Email digest job is missing userId');
      }

      const digest = await this.digestService.createUserEmailDigest(userId);
      if (!digest) {
        console.log(`Skipped email digest job ${job.id}: user is not eligible`);
        return;
      }

      await this.emailService.sendEmail(
        digest.email,
        '每日单词记忆报告',
        digest.html,
      );
      console.log(`Sent email digest job ${job.id}`);
      return;
    }

    if (job.name === digestQueueName.task.legacyEveryDayDigest) {
      console.log(`Ignored legacy digest scheduler job ${job.id}`);
      return;
    }

    throw new Error(`Unsupported digest job: ${job.name}`);
  }
}
