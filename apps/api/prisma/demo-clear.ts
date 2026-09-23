import { PrismaClient } from '@prisma/client';
import { clearDemoData } from './demo-data';

const prisma = new PrismaClient();

async function main() {
  const result = await clearDemoData(prisma);
  console.log(`Demo clear complete: ${result.deletedOrders} demo jobs deleted.`);
}

main().finally(() => prisma.$disconnect());
