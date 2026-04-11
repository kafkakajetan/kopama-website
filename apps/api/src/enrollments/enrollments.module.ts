import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CourseStartSlotsModule } from '../course-start-slots/course-start-slots.module';

@Module({
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  imports: [PrismaModule, AuthModule, CourseStartSlotsModule],
})
export class EnrollmentsModule {}
