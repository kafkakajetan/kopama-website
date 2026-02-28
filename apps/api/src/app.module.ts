import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CourseCategoriesModule } from './course-categories/course-categories.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { OffersModule } from './offers/offers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    CourseCategoriesModule,
    EnrollmentsModule,
    OffersModule,
  ],
})
export class AppModule {}
