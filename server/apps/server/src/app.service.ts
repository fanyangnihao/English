import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/shared';
@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}
  getHello() {
    return 'Hello World!123123';
  }
}
