import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractPdfService } from './contract-pdf.service';
import { ContractsService } from './contracts.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ContractTemplateResolver } from './contract-template.resolver';

@Module({
  controllers: [ContractsController],
  imports: [ConfigModule, PrismaModule, AuthModule],
  providers: [ContractPdfService, ContractsService, ContractTemplateResolver],
  exports: [ContractPdfService, ContractsService, ContractTemplateResolver],
})
export class ContractsModule {}
