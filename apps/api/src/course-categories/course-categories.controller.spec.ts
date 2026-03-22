import { Test, TestingModule } from '@nestjs/testing';
import { CourseCategoriesController } from './course-categories.controller';

describe('CourseCategoriesController', () => {
  let controller: CourseCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseCategoriesController],
    }).compile();

    controller = module.get<CourseCategoriesController>(CourseCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
