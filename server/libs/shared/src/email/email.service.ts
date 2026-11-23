import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = Number(this.configService.get<string>('EMAIL_PORT'));
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');
    const from = this.configService.get<string>('EMAIL_FROM');

    if (!host) {
      throw new Error('EMAIL_HOST is not configured');
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('EMAIL_PORT must be a valid TCP port');
    }
    if (!user || !pass) {
      throw new Error('EMAIL_USER and EMAIL_PASSWORD must be configured');
    }
    if (!from) {
      throw new Error('EMAIL_FROM must be configured');
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: !!Number(this.configService.get<string>('EMAIL_USE_SSL')),
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   *
   * @param to 发送给谁
   * @param subject 标题
   * @param text 内容
   */
  async sendEmail(to: string, subject: string, text: string) {
    if (!to.trim()) {
      throw new Error('Email recipient is required');
    }

    return this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html: text,
    });
  }
}
