import { Controller, Get } from '@nestjs/common';
import { CourseCategoriesService } from './course-categories.service';

@Controller('course-categories')
export class CourseCategoriesController {
  constructor(private readonly service: CourseCategoriesService) {}
  @Get()
  list() {
    return this.service.list();
  }
}
