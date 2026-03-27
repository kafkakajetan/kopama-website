import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractPdfService } from './contract-pdf.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [ContractsController],
  imports: [ConfigModule],
  providers: [ContractPdfService],
  exports: [ContractPdfService],
})
export class ContractsModule {}
