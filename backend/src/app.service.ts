import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
};

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const databaseConnected = await this.prisma.isDatabaseConnected();

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      database: databaseConnected ? 'connected' : 'disconnected',
    };
  }
}
