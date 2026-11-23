import { DigestScheduleService } from './digest-schedule.service';

describe('DigestScheduleService', () => {
  const queue = {
    upsertJobScheduler: jest.fn(),
    removeJobScheduler: jest.fn(),
  };
  const service = new DigestScheduleService(queue as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('upserts an exact per-user daily schedule', async () => {
    await service.sync({
      id: 'user-1',
      email: 'user@example.com',
      isTimingTask: true,
      timingTaskTime: '18:27:30',
    });

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'user-digest-user-1',
      {
        pattern: '30 27 18 * * *',
        tz: 'Asia/Shanghai',
      },
      expect.objectContaining({
        name: 'EMAIL_DIGEST_TASK',
        data: { userId: 'user-1' },
      }),
    );
  });

  it('removes the schedule when timing mail is disabled', async () => {
    await service.sync({
      id: 'user-1',
      email: 'user@example.com',
      isTimingTask: false,
      timingTaskTime: '18:27:30',
    });

    expect(queue.removeJobScheduler).toHaveBeenCalledWith('user-digest-user-1');
    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
  });
});
