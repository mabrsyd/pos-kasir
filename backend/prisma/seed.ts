import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== ROLES =====
  const ownerRole = await prisma.role.upsert({
    where: { name: 'OWNER' },
    update: {},
    create: {
      name: 'OWNER',
      description: 'Pemilik toko — akses penuh',
      permissions: [
        'dashboard', 'pos', 'products', 'categories', 'units',
        'stock', 'stock_adjustment', 'suppliers', 'purchases',
        'expenses', 'customers', 'sales', 'returns', 'void',
        'cash_session', 'reports', 'users', 'devices', 'settings',
        'audit_logs', 'sync',
      ],
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Admin toko — manajemen operasional',
      permissions: [
        'dashboard', 'pos', 'products', 'categories', 'units',
        'stock', 'stock_adjustment', 'suppliers', 'purchases',
        'expenses', 'customers', 'sales', 'returns', 'void',
        'cash_session', 'reports', 'audit_logs',
      ],
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: 'CASHIER' },
    update: {},
    create: {
      name: 'CASHIER',
      description: 'Kasir — fokus transaksi',
      permissions: [
        'pos', 'products', 'sales', 'customers',
        'cash_session',
      ],
    },
  });

  console.log('✅ Roles created');

  // ===== DEFAULT USERS =====
  const hashedPassword = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      password: hashedPassword,
      fullName: 'Pemilik Toko',
      roleId: ownerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Admin Toko',
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'kasir' },
    update: {},
    create: {
      username: 'kasir',
      password: hashedPassword,
      fullName: 'Kasir 1',
      roleId: cashierRole.id,
    },
  });

  console.log('✅ Users created (password: admin123)');

  // ===== CATEGORIES =====
  const categories = [
    { name: 'Makanan', description: 'Produk makanan' },
    { name: 'Minuman', description: 'Produk minuman' },
    { name: 'Rokok', description: 'Produk rokok' },
    { name: 'Sabun & Deterjen', description: 'Produk kebersihan' },
    { name: 'Bumbu Dapur', description: 'Bumbu dan bahan masakan' },
    { name: 'Snack', description: 'Makanan ringan' },
    { name: 'ATK', description: 'Alat tulis kantor' },
    { name: 'BBM', description: 'Bahan bakar minyak' },
    { name: 'Lainnya', description: 'Produk lainnya' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories created');

  // ===== UNITS =====
  const units = [
    { name: 'pcs', description: 'Pieces / satuan' },
    { name: 'pak', description: 'Pak / paket' },
    { name: 'dus', description: 'Dus / karton' },
    { name: 'kg', description: 'Kilogram' },
    { name: 'gram', description: 'Gram' },
    { name: 'liter', description: 'Liter' },
    { name: 'botol', description: 'Botol' },
    { name: 'sachet', description: 'Sachet' },
    { name: 'bungkus', description: 'Bungkus' },
    { name: 'batang', description: 'Batang' },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: unit,
    });
  }
  console.log('✅ Units created');

  // ===== DEFAULT SETTINGS =====
  const settings = [
    { key: 'store_name', value: 'Toko Ennou' },
    { key: 'store_address', value: 'Jl. Contoh No. 1, Indonesia' },
    { key: 'store_phone', value: '08123456789' },
    { key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda!' },
    { key: 'tax_enabled', value: 'false' },
    { key: 'tax_percentage', value: '0' },
    { key: 'currency', value: 'IDR' },
    { key: 'low_stock_threshold', value: '5' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Settings created');

  // ===== SAMPLE PRODUCTS =====
  const bbmCategory = await prisma.category.findUnique({ where: { name: 'BBM' } });
  const minumanCategory = await prisma.category.findUnique({ where: { name: 'Minuman' } });
  const snackCategory = await prisma.category.findUnique({ where: { name: 'Snack' } });
  const rokokCategory = await prisma.category.findUnique({ where: { name: 'Rokok' } });

  const literUnit = await prisma.unit.findUnique({ where: { name: 'liter' } });
  const pcsUnit = await prisma.unit.findUnique({ where: { name: 'pcs' } });
  const bungkusUnit = await prisma.unit.findUnique({ where: { name: 'bungkus' } });

  if (bbmCategory && literUnit) {
    await prisma.product.upsert({
      where: { sku: 'FUEL-PERTALITE' },
      update: {},
      create: {
        name: 'Pertalite',
        sku: 'FUEL-PERTALITE',
        categoryId: bbmCategory.id,
        unitId: literUnit.id,
        productType: 'FUEL',
        purchasePrice: 9500,
        sellingPrice: 10000,
        minimumStock: 50,
        currentStock: 200,
      },
    });

    await prisma.product.upsert({
      where: { sku: 'FUEL-PERTAMAX' },
      update: {},
      create: {
        name: 'Pertamax',
        sku: 'FUEL-PERTAMAX',
        categoryId: bbmCategory.id,
        unitId: literUnit.id,
        productType: 'FUEL',
        purchasePrice: 12500,
        sellingPrice: 13000,
        minimumStock: 30,
        currentStock: 150,
      },
    });
  }

  if (minumanCategory && pcsUnit) {
    await prisma.product.upsert({
      where: { sku: 'MNM-AQUA600' },
      update: {},
      create: {
        name: 'Aqua 600ml',
        sku: 'MNM-AQUA600',
        barcode: '8886008101053',
        categoryId: minumanCategory.id,
        unitId: pcsUnit.id,
        productType: 'RETAIL',
        purchasePrice: 2500,
        sellingPrice: 3500,
        minimumStock: 10,
        currentStock: 48,
      },
    });

    await prisma.product.upsert({
      where: { sku: 'MNM-TEHBOTOL' },
      update: {},
      create: {
        name: 'Teh Botol Sosro 350ml',
        sku: 'MNM-TEHBOTOL',
        barcode: '8886014600011',
        categoryId: minumanCategory.id,
        unitId: pcsUnit.id,
        productType: 'RETAIL',
        purchasePrice: 3000,
        sellingPrice: 4000,
        minimumStock: 10,
        currentStock: 36,
      },
    });
  }

  if (snackCategory && bungkusUnit) {
    await prisma.product.upsert({
      where: { sku: 'SNK-INDOMIEGRG' },
      update: {},
      create: {
        name: 'Indomie Goreng',
        sku: 'SNK-INDOMIEGRG',
        barcode: '8996001440149',
        categoryId: snackCategory.id,
        unitId: bungkusUnit.id,
        productType: 'RETAIL',
        purchasePrice: 2600,
        sellingPrice: 3500,
        minimumStock: 20,
        currentStock: 100,
      },
    });
  }

  if (rokokCategory && bungkusUnit) {
    await prisma.product.upsert({
      where: { sku: 'RKK-GUDANGGAR16' },
      update: {},
      create: {
        name: 'Gudang Garam Filter 16',
        sku: 'RKK-GUDANGGAR16',
        barcode: '8990019210017',
        categoryId: rokokCategory.id,
        unitId: bungkusUnit.id,
        productType: 'RETAIL',
        purchasePrice: 24000,
        sellingPrice: 28000,
        minimumStock: 5,
        currentStock: 30,
      },
    });
  }

  console.log('✅ Sample products created');

  // ===== SAMPLE SUPPLIERS =====
  await prisma.supplier.upsert({
    where: { id: 'default-supplier-1' },
    update: {},
    create: {
      id: 'default-supplier-1',
      name: 'PT Indofood',
      phone: '021-12345678',
      address: 'Jakarta',
    },
  });

  await prisma.supplier.upsert({
    where: { id: 'default-supplier-2' },
    update: {},
    create: {
      id: 'default-supplier-2',
      name: 'PT Pertamina',
      phone: '021-87654321',
      address: 'Jakarta',
      notes: 'Supplier BBM',
    },
  });

  console.log('✅ Sample suppliers created');

  console.log('\n🎉 Seed completed!');
  console.log('📋 Default login credentials:');
  console.log('   Username: owner / admin / kasir');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
