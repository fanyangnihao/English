import type { Queue } from 'bullmq';

export const DIGEST_TIMEZONE = 'Asia/Shanghai';

export const digestQueueName = {
  name: 'DIGEST_QUEUE',
  scheduler: {
    legacyEveryDayDigest: 'daily-digest-scheduler',
    userPrefix: 'user-digest-',
  },
  task: {
    emailDigest: 'EMAIL_DIGEST_TASK',
    legacyEveryDayDigest: 'EVERY_DAY_DIGEST_TASK',
  },
} as const;

export type DigestScheduleUser = {
  id: string;
  email?: string | null;
  isTimingTask: boolean;
  timingTaskTime: string;
};

export const getUserDigestSchedulerId = (userId: string): string =>
  `${digestQueueName.scheduler.userPrefix}${userId}`;

export const getDigestCronPattern = (timingTaskTime: string): string => {
  const timeParts = timingTaskTime.split(':').map(Number);
  const [hour, minute, second = 0] = timeParts;

  if (
    timeParts.length < 2 ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    !Number.isInteger(second) ||
    second < 0 ||
    second > 59
  ) {
    throw new Error(`Invalid timingTaskTime: ${timingTaskTime}`);
  }

  return `${second} ${minute} ${hour} * * *`;
};

export const syncUserDigestSchedule = async (
  queue: Queue,
  user: DigestScheduleUser,
): Promise<boolean> => {
  const schedulerId = getUserDigestSchedulerId(user.id);
  const email = user.email?.trim();

  if (!user.isTimingTask || !email) {
    await queue.removeJobScheduler(schedulerId);
    return false;
  }

  await queue.upsertJobScheduler(
    schedulerId,
    {
      pattern: getDigestCronPattern(user.timingTaskTime),
      tz: DIGEST_TIMEZONE,
    },
    {
      name: digestQueueName.task.emailDigest,
      data: {
        userId: user.id,
      },
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
        removeOnComplete: {
          age: 7 * 24 * 60 * 60,
        },
        removeOnFail: {
          age: 30 * 24 * 60 * 60,
        },
      },
    },
  );

  return true;
};
