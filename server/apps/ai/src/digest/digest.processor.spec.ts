import { Job } from 'bullmq';
import { DigestProcessor } from './digest.processor';
import { digestQueueName } from './digest.queue';

jest.mock('./digest.service', () => ({
  DigestService: class DigestService {},
}));
jest.mock('@libs/shared', () => ({
  EmailService: class EmailService {},
  digestQueueName: {
    name: 'DIGEST_QUEUE',
    task: {
      emailDigest: 'EMAIL_DIGEST_TASK',
      legacyEveryDayDigest: 'EVERY_DAY_DIGEST_TASK',
    },
  },
}));

describe('DigestProcessor', () => {
  const digestService = {
    createUserEmailDigest: jest.fn(),
  };
  const emailService = {
    sendEmail: jest.fn(),
  };
  const processor = new DigestProcessor(
    digestService as never,
    emailService as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('generates the digest at delivery time and sends it', async () => {
    digestService.createUserEmailDigest.mockResolvedValue({
      email: 'user@example.com',
      html: '<p>report</p>',
    });
    emailService.sendEmail.mockResolvedValue({});

    await processor.process({
      id: 'job-1',
      name: digestQueueName.task.emailDigest,
      data: { userId: 'user-1' },
    } as Job);

    expect(digestService.createUserEmailDigest).toHaveBeenCalledWith('user-1');
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'user@example.com',
      '每日单词记忆报告',
      '<p>report</p>',
    );
  });

  it('ignores jobs from the retired global scheduler', async () => {
    await processor.process({
      id: 'job-2',
      name: digestQueueName.task.legacyEveryDayDigest,
      data: {},
    } as Job);

    expect(digestService.createUserEmailDigest).not.toHaveBeenCalled();
  });
});
