import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  digestQueueName,
  PrismaService,
  syncUserDigestSchedule,
} from '@libs/shared';
import dayjs from 'dayjs';
import { createAgent } from 'langchain';
import { createDeepSeek } from '../llm/llm.config';
import { tool } from '@langchain/core/tools'; //引入langchain的工具
import marked from 'marked';
import { Queue } from 'bullmq'; //类型
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class DigestService implements OnModuleInit {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(digestQueueName.name) private readonly digestQueue: Queue,
  ) {}

  //普通的大模型他只能输出文字，他没有办法进行比如查看代码 查看图片 或者是连接数据库
  //也就是说大模型会根据我们的tool里面的描述会自动选择要不要调用这个工具
  private queryTool() {
    return tool(
      async ({ userId }: { userId: string }) => {
        const user = await this.prismaService.user.findFirst({
          where: {
            id: userId,
          },
          select: {
            email: true, //邮箱
            name: true, //用户名
            wordNumber: true, //单词数量
            //查询今天的单词记录
            wordBookRecords: {
              where: {
                createdAt: {
                  //今天00:00:00 - 明天00:00:00
                  gte: dayjs().startOf('day').toDate(),
                  lt: dayjs().add(1, 'day').startOf('day').toDate(),
                },
              },
              select: {
                //找到那个表
                word: {
                  select: {
                    //找到那个单词
                    word: true,
                  },
                },
              },
            },
          },
        });
        return user;
      },
      {
        name: 'queryTool', //名字一定要语义化 唯一不能重复
        description: '根据用户id查询用户学习的单词记录', //他会通过desc 和 name 选择要不要调用这个工具
        //JSON Schema 是用来描述数据结构的，他可以用来验证数据是否符合要求
        //给大模型看的 {userId: '1234567890'}
        schema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: '用户id' },
          },
          required: ['userId'],
        },
      },
    );
  }

  async onModuleInit() {
    await this.digestQueue.removeJobScheduler(
      digestQueueName.scheduler.legacyEveryDayDigest,
    );

    const users = await this.prismaService.user.findMany({
      where: {
        isTimingTask: true,
        timingTaskTime: { not: '' },
        email: { not: '' },
      },
      select: {
        id: true,
        email: true,
        isTimingTask: true,
        timingTaskTime: true,
      },
    });

    for (const user of users) {
      try {
        await syncUserDigestSchedule(this.digestQueue, user);
      } catch (error) {
        console.error(
          `Failed to restore email digest schedule for user ${user.id}`,
          error,
        );
      }
    }
  }

  async createUserEmailDigest(userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        isTimingTask: true,
        timingTaskTime: { not: '' },
        email: { not: '' },
        wordBookRecords: {
          some: {
            createdAt: {
              gte: dayjs().startOf('day').toDate(),
              lt: dayjs().add(1, 'day').startOf('day').toDate(),
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user?.email) {
      return null;
    }

    try {
      const agent = createAgent({
        model: createDeepSeek(),
        tools: [this.queryTool()],
        systemPrompt:
          '你是一个单词记忆助手，根据用户信息和单词记录，生成单词记忆报告',
      });

      const result = await agent.invoke({
        messages: [
          {
            role: 'user',
            content: `查询用户信息,并且根据用户id关联单词记录表，查询出用户今天的单词记录,用户id: ${user.id}，过滤掉敏感信息`,
          },
        ],
      });
      const content = result.messages.at(-1)?.content;

      if (typeof content !== 'string' || !content.trim()) {
        throw new Error(
          `Email digest generation returned no content for user ${userId}`,
        );
      }

      return {
        email: user.email,
        html: await marked.parse(content),
      };
    } catch (error) {
      console.error(
        `Failed to generate email digest for user ${userId}`,
        error,
      );
      throw error;
    }
  }
}
