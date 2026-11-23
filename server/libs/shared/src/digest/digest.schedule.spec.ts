import {
  getDigestCronPattern,
  getUserDigestSchedulerId,
} from './digest.schedule';

describe('digest schedule helpers', () => {
  it('builds an exact daily cron pattern with seconds', () => {
    expect(getDigestCronPattern('18:27:30')).toBe('30 27 18 * * *');
    expect(getDigestCronPattern('18:27')).toBe('0 27 18 * * *');
  });

  it('rejects invalid scheduling times', () => {
    expect(() => getDigestCronPattern('24:00:00')).toThrow(
      'Invalid timingTaskTime',
    );
  });

  it('builds a stable per-user scheduler id', () => {
    expect(getUserDigestSchedulerId('user-1')).toBe('user-digest-user-1');
  });
});
