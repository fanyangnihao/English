import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const config = new Map<string, string>([
    ['EMAIL_HOST', 'smtp.example.com'],
    ['EMAIL_PORT', '465'],
    ['EMAIL_USE_SSL', '1'],
    ['EMAIL_USER', 'sender@example.com'],
    ['EMAIL_PASSWORD', 'password'],
    ['EMAIL_FROM', 'English <sender@example.com>'],
  ]);
  const configService = {
    get: jest.fn((key: string) => config.get(key)),
  } as unknown as ConfigService;

  it('returns the transporter result after a successful send', async () => {
    const service = new EmailService(configService);
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' });
    (service as unknown as { transporter: unknown }).transporter = {
      sendMail,
    };

    await expect(
      service.sendEmail('user@example.com', 'subject', '<p>body</p>'),
    ).resolves.toEqual({ messageId: 'message-1' });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'English <sender@example.com>',
      to: 'user@example.com',
      subject: 'subject',
      html: '<p>body</p>',
    });
  });

  it('propagates send failures instead of reporting success', async () => {
    const service = new EmailService(configService);
    (service as unknown as { transporter: unknown }).transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP rejected')),
    };

    await expect(
      service.sendEmail('user@example.com', 'subject', '<p>body</p>'),
    ).rejects.toThrow('SMTP rejected');
  });
});
