import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CourseStartSlotsController } from './course-start-slots.controller';
import { CourseStartSlotsService } from './course-start-slots.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CourseStartSlotsController],
  providers: [CourseStartSlotsService],
  exports: [CourseStartSlotsService],
})
export class CourseStartSlotsModule {}
