import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CourseCategoriesModule } from './course-categories/course-categories.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { OffersModule } from './offers/offers.module';
import { AuthModule } from './auth/auth.module';
import { ContractsModule } from './contracts/contracts.module';
import { MeModule } from './me/me.module';
import { AdminModule } from './admin/admin.module';
import { CourseStartSlotsModule } from './course-start-slots/course-start-slots.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    CourseCategoriesModule,
    EnrollmentsModule,
    OffersModule,
    AuthModule,
    ContractsModule,
    MeModule,
    AdminModule,
    CourseStartSlotsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
