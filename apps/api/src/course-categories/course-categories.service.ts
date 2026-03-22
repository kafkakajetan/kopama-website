import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseCategoriesService {
  constructor(private prisma: PrismaService) {}
  list() {
    return this.prisma.courseCategory.findMany({ orderBy: { code: 'asc' } });
  }
}
