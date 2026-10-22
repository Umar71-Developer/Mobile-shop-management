const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.upsert({
    where: { phone: '03001234567' },
    update: {},
    create: { name: 'Shop Owner', phone: '03001234567', password, role: 'owner' }
  });
  console.log('✅ Owner created:', owner.name, '| Phone: 03001234567 | Password: admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
