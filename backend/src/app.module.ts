import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

const envFilePaths = [resolve(process.cwd(), '..', '.env'), resolve(process.cwd(), '.env')];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: envFilePaths,
      isGlobal: true,
    }),
    PrismaModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
