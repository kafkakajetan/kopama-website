import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractPdfService } from './contract-pdf.service';
import { ContractsService } from './contracts.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [ContractsController],
  imports: [ConfigModule, PrismaModule, AuthModule],
  providers: [ContractPdfService, ContractsService],
  exports: [ContractPdfService, ContractsService],
})
export class ContractsModule {}
