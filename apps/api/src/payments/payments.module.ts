import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
