import { PrismaClient } from '@prisma/client';
import { loadDemoData } from './demo-data';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@nfl.local' } });
  if (!admin) throw new Error('Run npm run db:seed first so admin@nfl.local exists.');
  const result = await loadDemoData(prisma, admin.id);
  console.log(`Demo seed complete: ${result.createdOrders} jobs loaded (${result.demoBatch}).`);
  console.log('All demo jobs are isolated from the running Job No sequence and can be deleted together.');
}

main().finally(() => prisma.$disconnect());
