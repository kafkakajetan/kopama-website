import { Controller, Get } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersController {
  constructor(private readonly service: OffersService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
