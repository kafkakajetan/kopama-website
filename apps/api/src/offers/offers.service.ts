import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.offerItem.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        courseCategory: true,
        priceRules: { orderBy: { customerType: 'asc' } },
      },
    });
  }
}
