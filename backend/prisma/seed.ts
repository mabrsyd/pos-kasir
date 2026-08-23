import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning up old data...');
  
  // Clean in correct foreign key order
  await prisma.syncOperation.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.returnItem.deleteMany({});
  await prisma.return.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.cashTransaction.deleteMany({});
  await prisma.cashSession.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('🧹 Cleaned database tables.');

  // ============================================================
  // 1. ROLES & PERMISSIONS
  // ============================================================
  const ownerRole = await prisma.role.create({
    data: {
      name: 'OWNER',
      description: 'Pemilik Toko — Akses Penuh ke Semua Fitur & Laporan',
      permissions: [
        'dashboard', 'pos', 'products', 'categories', 'units',
        'stock', 'stock_adjustment', 'suppliers', 'purchases',
        'expenses', 'customers', 'sales', 'returns', 'void',
        'cash_session', 'reports', 'users', 'devices', 'settings',
        'audit_logs', 'sync',
      ],
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Admin Toko — Manajemen Operasional & Stok',
      permissions: [
        'dashboard', 'pos', 'products', 'categories', 'units',
        'stock', 'stock_adjustment', 'suppliers', 'purchases',
        'expenses', 'customers', 'sales', 'returns', 'void',
        'cash_session', 'reports', 'audit_logs',
      ],
    },
  });

  const cashierRole = await prisma.role.create({
    data: {
      name: 'CASHIER',
      description: 'Kasir — Fokus Transaksi & Kas Harian',
      permissions: [
        'pos', 'products', 'sales', 'customers',
        'cash_session',
      ],
    },
  });

  console.log('✅ Roles created');

  // ============================================================
  // 2. USERS
  // ============================================================
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const ownerUser = await prisma.user.create({
    data: {
      username: 'owner',
      password: hashedPassword,
      fullName: 'Haji Ennou (Owner)',
      roleId: ownerRole.id,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Ahmad Fauzi (Admin)',
      roleId: adminRole.id,
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      username: 'kasir',
      password: hashedPassword,
      fullName: 'Siti Rahma (Kasir Pagi)',
      roleId: cashierRole.id,
    },
  });

  console.log('✅ Users created (Login: owner / admin / kasir | Pass: admin123)');

  // ============================================================
  // 3. CATEGORIES
  // ============================================================
  const catData = [
    { name: 'BBM (Pom Mini)', description: 'Bahan bakar minyak bensin & solar' },
    { name: 'Sembako', description: 'Beras, minyak goreng, gula, telur, tepung' },
    { name: 'Makanan & Mie', description: 'Mie instan, sarden, bumbu dapur' },
    { name: 'Minuman', description: 'Air mineral, teh kemasan, kopi, susu' },
    { name: 'Rokok', description: 'Rokok kretek, filter, dan putih' },
    { name: 'Snack & Cemilan', description: 'Camilan ringan, biskuit, cokelat' },
    { name: 'Kebersihan & Rumah', description: 'Sabun mandi, deterjen, shampoo, odol' },
    { name: 'Obat & Perawatan', description: 'Obat bebas, minyak kayu putih, plester' },
    { name: 'Alat Tulis (ATK)', description: 'Buku, pulpen, amplop' },
  ];

  const categories: Record<string, any> = {};
  for (const c of catData) {
    categories[c.name] = await prisma.category.create({ data: c });
  }
  console.log('✅ Categories created');

  // ============================================================
  // 4. UNITS
  // ============================================================
  const unitData = [
    { name: 'liter', description: 'Liter (untuk BBM)' },
    { name: 'pcs', description: 'Satuan buah / botol / kaleng' },
    { name: 'bungkus', description: 'Bungkus / pack kecil' },
    { name: 'kg', description: 'Kilogram' },
    { name: 'pak', description: 'Pak / renteng' },
    { name: 'dus', description: 'Dus / karton besar' },
    { name: 'sachet', description: 'Sachet satuan' },
    { name: 'strip', description: 'Strip obat' },
  ];

  const units: Record<string, any> = {};
  for (const u of unitData) {
    units[u.name] = await prisma.unit.create({ data: u });
  }
  console.log('✅ Units created');

  // ============================================================
  // 5. SETTINGS
  // ============================================================
  const settingsData = [
    { key: 'store_name', value: 'Toko Madura & Pom Mini Ennou' },
    { key: 'store_address', value: 'Jl. Raya KH. Ahmad Dahlan No. 88, RT 02/05' },
    { key: 'store_phone', value: '0812-3456-7890' },
    { key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda! Semoga berkah.' },
    { key: 'tax_enabled', value: 'false' },
    { key: 'tax_percentage', value: '0' },
    { key: 'currency', value: 'IDR' },
    { key: 'low_stock_threshold', value: '10' },
  ];

  for (const s of settingsData) {
    await prisma.setting.create({ data: s });
  }
  console.log('✅ Settings created');

  // ============================================================
  // 6. SUPPLIERS
  // ============================================================
  const supplierIndofood = await prisma.supplier.create({
    data: {
      name: 'PT Indofood CBP Sukses Makmur',
      phone: '021-57958822',
      address: 'Kawasan Industri Pulogadung, Jakarta Timur',
      notes: 'Distributor utama Mie Instan, Bumbu Racik, Sambal Indofood',
      totalDebt: 1850000,
    },
  });

  const supplierPertamina = await prisma.supplier.create({
    data: {
      name: 'PT Pertamina Patra Niaga',
      phone: '135',
      address: 'Terminal BBM Plumpang, Jakarta Utara',
      notes: 'Pasokan resmi BBM Pom Mini (Pertalite & Pertamax)',
      totalDebt: 0,
    },
  });

  const supplierWings = await prisma.supplier.create({
    data: {
      name: 'PT Wings Surya Distributor',
      phone: '021-4600123',
      address: 'Daan Mogot KM 12, Jakarta Barat',
      notes: 'Distributor sabun, deterjen Rinso/Daia, Mie Sedaap, Ale-Ale',
      totalDebt: 750000,
    },
  });

  const supplierGudangGaram = await prisma.supplier.create({
    data: {
      name: 'Agen Rokok Sumber Jaya',
      phone: '0813-8899-7711',
      address: 'Pasar Induk Kramat Jati, Jakarta Timur',
      notes: 'Distributor rokok GG Filter, Sampoerna Mild, Djarum Super',
      totalDebt: 0,
    },
  });

  const supplierSembako = await prisma.supplier.create({
    data: {
      name: 'CV Sumber Pangan Madura',
      phone: '0812-7766-5544',
      address: 'Pasar Beras Cipinang Blok C No. 12',
      notes: 'Suplai Beras Ramos 5kg, Telur Ayam Negeri, Gula Pasir, Minyak Goreng',
      totalDebt: 1200000,
    },
  });

  console.log('✅ Suppliers created');

  // ============================================================
  // 7. CUSTOMERS
  // ============================================================
  const customerUmum = await prisma.customer.create({
    data: {
      name: 'Pelanggan Umum',
      phone: '-',
      address: '-',
      notes: 'Pelanggan umum non-member',
    },
  });

  const customerUsman = await prisma.customer.create({
    data: {
      name: 'Pak Haji Usman',
      phone: '0813-1122-3344',
      address: 'Warung Nasi Berkah, RT 01',
      notes: 'Langganan beli Beras, Minyak, Telur dan Pertalite jerigen',
    },
  });

  const customerSiti = await prisma.customer.create({
    data: {
      name: 'Ibu Siti Aminah',
      phone: '0815-9988-7766',
      address: 'Jl. Melati No. 14, RT 03',
      notes: 'Langganan belanja sembako harian & sabun',
    },
  });

  const customerDanang = await prisma.customer.create({
    data: {
      name: 'Mas Danang (Driver Gojek)',
      phone: '0878-3344-5566',
      address: 'Basecamp Ojol Depan Toko',
      notes: 'Langganan isi Pertalite & Rokok Sampoerna Mild',
    },
  });

  console.log('✅ Customers created');

  // ============================================================
  // 8. PRODUCTS
  // ============================================================
  const productList = [
    // BBM Pom Mini
    {
      name: 'Pertalite (RON 90)',
      sku: 'FUEL-PERTALITE',
      barcode: null,
      categoryId: categories['BBM (Pom Mini)'].id,
      unitId: units['liter'].id,
      productType: 'FUEL' as const,
      purchasePrice: 9300,
      sellingPrice: 10000,
      minimumStock: 60,
      currentStock: 350,
    },
    {
      name: 'Pertamax (RON 92)',
      sku: 'FUEL-PERTAMAX',
      barcode: null,
      categoryId: categories['BBM (Pom Mini)'].id,
      unitId: units['liter'].id,
      productType: 'FUEL' as const,
      purchasePrice: 12200,
      sellingPrice: 12950,
      minimumStock: 40,
      currentStock: 195,
    },
    {
      name: 'Biosolar',
      sku: 'FUEL-SOLAR',
      barcode: null,
      categoryId: categories['BBM (Pom Mini)'].id,
      unitId: units['liter'].id,
      productType: 'FUEL' as const,
      purchasePrice: 6200,
      sellingPrice: 6800,
      minimumStock: 50,
      currentStock: 25, // LOW STOCK TRIGGER!
    },

    // Sembako
    {
      name: 'Beras Ramos Premium 5kg',
      sku: 'SMB-RAMOS5KG',
      barcode: '8991001000018',
      categoryId: categories['Sembako'].id,
      unitId: units['pak'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 65000,
      sellingPrice: 73000,
      minimumStock: 8,
      currentStock: 26,
    },
    {
      name: 'Minyak Goreng Bimoli 2 Liter',
      sku: 'SMB-BIMOLI2L',
      barcode: '8991002000025',
      categoryId: categories['Sembako'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 32500,
      sellingPrice: 36500,
      minimumStock: 10,
      currentStock: 22,
    },
    {
      name: 'Telur Ayam Negeri 1kg',
      sku: 'SMB-TELUR1KG',
      barcode: '8991003000032',
      categoryId: categories['Sembako'].id,
      unitId: units['kg'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 25500,
      sellingPrice: 28500,
      minimumStock: 15,
      currentStock: 40,
    },
    {
      name: 'Gula Pasir Gulaku 1kg',
      sku: 'SMB-GULAKU1KG',
      barcode: '8991004000049',
      categoryId: categories['Sembako'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 15500,
      sellingPrice: 17500,
      minimumStock: 10,
      currentStock: 35,
    },
    {
      name: 'Tepung Terigu Segitiga Biru 1kg',
      sku: 'SMB-SEGITIGA1KG',
      barcode: '8991005000056',
      categoryId: categories['Sembako'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 11000,
      sellingPrice: 13000,
      minimumStock: 8,
      currentStock: 28,
    },

    // Makanan & Mie
    {
      name: 'Indomie Goreng Spesial',
      sku: 'MIE-INDOMIEGRG',
      barcode: '8996001440149',
      categoryId: categories['Makanan & Mie'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2800,
      sellingPrice: 3500,
      minimumStock: 25,
      currentStock: 160,
    },
    {
      name: 'Indomie Kuah Soto Ayam',
      sku: 'MIE-INDOMIESOTO',
      barcode: '8996001440156',
      categoryId: categories['Makanan & Mie'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2800,
      sellingPrice: 3500,
      minimumStock: 25,
      currentStock: 120,
    },
    {
      name: 'Mie Sedaap Goreng',
      sku: 'MIE-SEDAAPGRG',
      barcode: '8998866200115',
      categoryId: categories['Makanan & Mie'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2750,
      sellingPrice: 3500,
      minimumStock: 20,
      currentStock: 85,
    },
    {
      name: 'Pop Mie Rasa Ayam Bawang',
      sku: 'MIE-POPMIEAB',
      barcode: '8996001440309',
      categoryId: categories['Makanan & Mie'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 4800,
      sellingPrice: 6000,
      minimumStock: 10,
      currentStock: 30,
    },

    // Minuman
    {
      name: 'Aqua Botol 600ml',
      sku: 'MNM-AQUA600',
      barcode: '8886008101053',
      categoryId: categories['Minuman'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2600,
      sellingPrice: 3500,
      minimumStock: 20,
      currentStock: 96,
    },
    {
      name: 'Le Minerale 600ml',
      sku: 'MNM-LEMIN600',
      barcode: '8886008101091',
      categoryId: categories['Minuman'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2500,
      sellingPrice: 3500,
      minimumStock: 15,
      currentStock: 64,
    },
    {
      name: 'Teh Botol Sosro Kotak 350ml',
      sku: 'MNM-TEHBOTOL350',
      barcode: '8886014600011',
      categoryId: categories['Minuman'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 3200,
      sellingPrice: 4500,
      minimumStock: 15,
      currentStock: 48,
    },
    {
      name: 'Teh Pucuk Harum 350ml',
      sku: 'MNM-TEHPUCUK',
      barcode: '8991002105157',
      categoryId: categories['Minuman'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2800,
      sellingPrice: 4000,
      minimumStock: 15,
      currentStock: 72,
    },
    {
      name: 'Kopi Kapal Api Spesial Mix',
      sku: 'MNM-KAPALAPI',
      barcode: '8991002101111',
      categoryId: categories['Minuman'].id,
      unitId: units['sachet'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 1400,
      sellingPrice: 2000,
      minimumStock: 30,
      currentStock: 150,
    },
    {
      name: 'Coca-Cola Pet 390ml',
      sku: 'MNM-COCACOLA',
      barcode: '8992761111003',
      categoryId: categories['Minuman'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 4500,
      sellingPrice: 6000,
      minimumStock: 10,
      currentStock: 3, // LOW STOCK TRIGGER!
    },
    {
      name: 'Ultra Milk Cokelat 250ml',
      sku: 'MNM-ULTRACOK',
      barcode: '8992741911001',
      categoryId: categories['Minuman'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 5500,
      sellingPrice: 7000,
      minimumStock: 12,
      currentStock: 32,
    },

    // Rokok
    {
      name: 'Gudang Garam Filter 16',
      sku: 'RKK-GGFILTER16',
      barcode: '8990019210017',
      categoryId: categories['Rokok'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 27500,
      sellingPrice: 31000,
      minimumStock: 10,
      currentStock: 50,
    },
    {
      name: 'Sampoerna A Mild 16',
      sku: 'RKK-AMILD16',
      barcode: '8992775210015',
      categoryId: categories['Rokok'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 32000,
      sellingPrice: 36000,
      minimumStock: 10,
      currentStock: 45,
    },
    {
      name: 'Djarum Super 12',
      sku: 'RKK-DJARUM12',
      barcode: '8991001120013',
      categoryId: categories['Rokok'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 22000,
      sellingPrice: 25000,
      minimumStock: 8,
      currentStock: 2, // LOW STOCK TRIGGER!
    },
    {
      name: 'Marlboro Merah 20',
      sku: 'RKK-MARLBORORD',
      barcode: '8992775110025',
      categoryId: categories['Rokok'].id,
      unitId: units['bungkus'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 38000,
      sellingPrice: 42500,
      minimumStock: 5,
      currentStock: 18,
    },

    // Snack
    {
      name: 'Chitato Sapi Panggang 68g',
      sku: 'SNK-CHITATO68G',
      barcode: '8996001350011',
      categoryId: categories['Snack & Cemilan'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 8500,
      sellingPrice: 11000,
      minimumStock: 8,
      currentStock: 25,
    },
    {
      name: 'Beng-Beng Chocolate Wafer',
      sku: 'SNK-BENGBENG',
      barcode: '8996001350028',
      categoryId: categories['Snack & Cemilan'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 1800,
      sellingPrice: 2500,
      minimumStock: 20,
      currentStock: 80,
    },
    {
      name: 'Silverqueen Cashew 58g',
      sku: 'SNK-SILVERQUEEN',
      barcode: '8996001350035',
      categoryId: categories['Snack & Cemilan'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 12500,
      sellingPrice: 16000,
      minimumStock: 6,
      currentStock: 20,
    },

    // Kebersihan & Rumah
    {
      name: 'Lifebuoy Sabun Batang Total 10',
      sku: 'KBR-LIFEBUOY',
      barcode: '8999999050012',
      categoryId: categories['Kebersihan & Rumah'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 3500,
      sellingPrice: 4500,
      minimumStock: 10,
      currentStock: 40,
    },
    {
      name: 'Sunlight Jeruk Nipis 750ml',
      sku: 'KBR-SUNLIGHT750',
      barcode: '8999999050029',
      categoryId: categories['Kebersihan & Rumah'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 14500,
      sellingPrice: 17500,
      minimumStock: 6,
      currentStock: 18,
    },
    {
      name: 'Rinso Molto Deterjen Bubuk 770g',
      sku: 'KBR-RINSOMOLTO',
      barcode: '8999999050036',
      categoryId: categories['Kebersihan & Rumah'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 18500,
      sellingPrice: 22500,
      minimumStock: 6,
      currentStock: 15,
    },
    {
      name: 'Pepsodent Pencegah Gigi 190g',
      sku: 'KBR-PEPSODENT190',
      barcode: '8999999050043',
      categoryId: categories['Kebersihan & Rumah'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 12000,
      sellingPrice: 15000,
      minimumStock: 8,
      currentStock: 4, // LOW STOCK TRIGGER!
    },

    // Obat & Perawatan
    {
      name: 'Panadol Biru Paracetamol 500mg',
      sku: 'OBT-PANADOL500',
      barcode: '8993001000015',
      categoryId: categories['Obat & Perawatan'].id,
      unitId: units['strip'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 10000,
      sellingPrice: 13000,
      minimumStock: 6,
      currentStock: 30,
    },
    {
      name: 'Minyak Kayu Putih Cap Lang 60ml',
      sku: 'OBT-MKP60ML',
      barcode: '8993001000022',
      categoryId: categories['Obat & Perawatan'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 21000,
      sellingPrice: 26000,
      minimumStock: 5,
      currentStock: 16,
    },

    // ATK
    {
      name: 'Buku Tulis Sinar Dunia 38 Lembar',
      sku: 'ATK-SIDU38',
      barcode: '8994001000012',
      categoryId: categories['Alat Tulis (ATK)'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 3200,
      sellingPrice: 4500,
      minimumStock: 10,
      currentStock: 55,
    },
    {
      name: 'Pulpen Standard AE7 Hitam',
      sku: 'ATK-STDAE7',
      barcode: '8994001000029',
      categoryId: categories['Alat Tulis (ATK)'].id,
      unitId: units['pcs'].id,
      productType: 'RETAIL' as const,
      purchasePrice: 2000,
      sellingPrice: 3000,
      minimumStock: 15,
      currentStock: 70,
    },
  ];

  const createdProducts: Record<string, any> = {};

  for (const item of productList) {
    const prod = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        productType: item.productType,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        minimumStock: item.minimumStock,
        currentStock: item.currentStock,
        category: {
          connect: { id: item.categoryId },
        },
        unit: {
          connect: { id: item.unitId },
        },
      },
      include: { unit: true, category: true },
    });
    createdProducts[item.sku] = prod;

    // Initial stock movement
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        movementType: 'OPENING',
        quantity: item.currentStock,
        stockBefore: 0,
        stockAfter: item.currentStock,
        reason: 'Stok awal sistem',
        userId: ownerUser.id,
      },
    });

    // Price history
    await prisma.priceHistory.create({
      data: {
        productId: prod.id,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        changedBy: ownerUser.id,
        reason: 'Harga awal',
      },
    });
  }

  console.log(`✅ ${productList.length} Products created with Opening Stock & Price History`);

  // ============================================================
  // 9. PURCHASES & INVENTORY RESTOCK
  // ============================================================
  const dateDaysAgo = (days: number, hours: number = 9) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hours, 0, 0, 0);
    return d;
  };

  // Purchase 1: Indofood restock (with partial debt)
  const po1 = await prisma.purchase.create({
    data: {
      purchaseNumber: 'PO-20260816-001',
      supplierId: supplierIndofood.id,
      userId: adminUser.id,
      status: 'RECEIVED',
      subtotal: 3850000,
      taxAmount: 0,
      total: 3850000,
      paidAmount: 2000000,
      debtAmount: 1850000,
      notes: 'Pembelian mie instan & snack Indofood. Sisa tempo 14 hari.',
      receivedAt: dateDaysAgo(7, 10),
      createdAt: dateDaysAgo(7, 10),
    },
  });

  await prisma.purchaseItem.createMany({
    data: [
      {
        purchaseId: po1.id,
        productId: createdProducts['MIE-INDOMIEGRG'].id,
        productName: createdProducts['MIE-INDOMIEGRG'].name,
        quantity: 500,
        purchasePrice: 2800,
        subtotal: 1400000,
      },
      {
        purchaseId: po1.id,
        productId: createdProducts['MIE-INDOMIESOTO'].id,
        productName: createdProducts['MIE-INDOMIESOTO'].name,
        quantity: 400,
        purchasePrice: 2800,
        subtotal: 1120000,
      },
      {
        purchaseId: po1.id,
        productId: createdProducts['SNK-CHITATO68G'].id,
        productName: createdProducts['SNK-CHITATO68G'].name,
        quantity: 100,
        purchasePrice: 8500,
        subtotal: 850000,
      },
      {
        purchaseId: po1.id,
        productId: createdProducts['SNK-BENGBENG'].id,
        productName: createdProducts['SNK-BENGBENG'].name,
        quantity: 266,
        purchasePrice: 1800,
        subtotal: 480000,
      },
    ],
  });

  // Purchase 2: Pertamina BBM (Paid in full)
  const po2 = await prisma.purchase.create({
    data: {
      purchaseNumber: 'PO-20260818-002',
      supplierId: supplierPertamina.id,
      userId: ownerUser.id,
      status: 'RECEIVED',
      subtotal: 5500000,
      taxAmount: 0,
      total: 5500000,
      paidAmount: 5500000,
      debtAmount: 0,
      notes: 'Pengisian tangki BBM Pom Mini Pertalite 400L & Pertamax 150L. Lunas via transfer.',
      receivedAt: dateDaysAgo(5, 8),
      createdAt: dateDaysAgo(5, 8),
    },
  });

  await prisma.purchaseItem.createMany({
    data: [
      {
        purchaseId: po2.id,
        productId: createdProducts['FUEL-PERTALITE'].id,
        productName: createdProducts['FUEL-PERTALITE'].name,
        quantity: 400,
        purchasePrice: 9300,
        subtotal: 3720000,
      },
      {
        purchaseId: po2.id,
        productId: createdProducts['FUEL-PERTAMAX'].id,
        productName: createdProducts['FUEL-PERTAMAX'].name,
        quantity: 145,
        purchasePrice: 12200,
        subtotal: 1780000,
      },
    ],
  });

  // Purchase 3: Sembako (CV Sumber Pangan - Partial Debt)
  const po3 = await prisma.purchase.create({
    data: {
      purchaseNumber: 'PO-20260820-003',
      supplierId: supplierSembako.id,
      userId: adminUser.id,
      status: 'RECEIVED',
      subtotal: 2700000,
      taxAmount: 0,
      total: 2700000,
      paidAmount: 1500000,
      debtAmount: 1200000,
      notes: 'Pasokan Beras Ramos 20 karung, Telur Ayam 40kg, Minyak Bimoli.',
      receivedAt: dateDaysAgo(3, 11),
      createdAt: dateDaysAgo(3, 11),
    },
  });

  // Purchase 4: Wings Surya
  const po4 = await prisma.purchase.create({
    data: {
      purchaseNumber: 'PO-20260822-004',
      supplierId: supplierWings.id,
      userId: adminUser.id,
      status: 'RECEIVED',
      subtotal: 1750000,
      taxAmount: 0,
      total: 1750000,
      paidAmount: 1000000,
      debtAmount: 750000,
      notes: 'Pasokan sabun cuci, pasta gigi, mie sedaap.',
      receivedAt: dateDaysAgo(1, 14),
      createdAt: dateDaysAgo(1, 14),
    },
  });

  console.log('✅ Purchases & Supplier invoices created');

  // ============================================================
  // 10. CASH SESSIONS
  // ============================================================
  const cashSessions: any[] = [];

  // Closed sessions for the past 6 days
  for (let i = 6; i >= 1; i--) {
    const openTime = dateDaysAgo(i, 7);
    const closeTime = dateDaysAgo(i, 22);
    const openingBal = 300000;
    const estSales = 1800000 + (6 - i) * 200000;
    const expectedBal = openingBal + estSales - 30000; // minus expense

    const cs = await prisma.cashSession.create({
      data: {
        userId: cashierUser.id,
        openingBalance: openingBal,
        expectedBalance: expectedBal,
        actualBalance: expectedBal,
        difference: 0,
        status: 'CLOSED',
        notes: `Tutup shift malam kasir hari -${i}. Kas seimbang sesuai fisik uang di laci.`,
        openedAt: openTime,
        closedAt: closeTime,
        createdAt: openTime,
      },
    });
    cashSessions.push(cs);
  }

  // Active OPEN Session for Today
  const todayOpenTime = new Date();
  todayOpenTime.setHours(7, 0, 0, 0);

  const activeCashSession = await prisma.cashSession.create({
    data: {
      userId: cashierUser.id,
      openingBalance: 300000,
      expectedBalance: 300000, // will be updated dynamically during sales seeding
      status: 'OPEN',
      notes: 'Shift Pagi aktif — Kasir Siti Rahma',
      openedAt: todayOpenTime,
      createdAt: todayOpenTime,
    },
  });
  cashSessions.push(activeCashSession);

  console.log('✅ Cash Sessions created (6 Closed, 1 Active Today)');

  // ============================================================
  // 11. EXPENSES
  // ============================================================
  const expensesList = [
    {
      category: 'Listrik & Air',
      amount: 100000,
      description: 'Beli Token Listrik PLN Toko 100rb',
      paymentMethod: 'CASH' as const,
      userId: cashierUser.id,
      expenseDate: new Date(),
    },
    {
      category: 'Operasional Toko',
      amount: 35000,
      description: 'Plastik Kresek Bening & Hitam (2 Pack)',
      paymentMethod: 'CASH' as const,
      userId: cashierUser.id,
      expenseDate: new Date(),
    },
    {
      category: 'Operasional Toko',
      amount: 18000,
      description: 'Air Galon Aqua untuk Dispenser Toko',
      paymentMethod: 'CASH' as const,
      userId: cashierUser.id,
      expenseDate: new Date(),
    },
    {
      category: 'Internet & Komunikasi',
      amount: 275000,
      description: 'Paket WiFi Internet Indihome Toko & POS',
      paymentMethod: 'DIGITAL' as const,
      userId: adminUser.id,
      expenseDate: dateDaysAgo(2, 10),
    },
    {
      category: 'Kebersihan & Keamanan',
      amount: 50000,
      description: 'Iuran Kebersihan Lingkungan & Keamanan Pasar',
      paymentMethod: 'CASH' as const,
      userId: ownerUser.id,
      expenseDate: dateDaysAgo(4, 9),
    },
    {
      category: 'Perlengkapan Kasir',
      amount: 65000,
      description: 'Beli Kertas Struk Thermal 58mm (10 Roll)',
      paymentMethod: 'CASH' as const,
      userId: cashierUser.id,
      expenseDate: dateDaysAgo(6, 14),
    },
  ];

  for (const exp of expensesList) {
    await prisma.expense.create({ data: exp });
  }

  // Add today's cash out transaction to active session
  await prisma.cashTransaction.create({
    data: {
      cashSessionId: activeCashSession.id,
      type: 'EXPENSE',
      amount: -35000,
      description: 'Pengeluaran kasir: Plastik Kresek 2 Pack',
      createdAt: new Date(),
    },
  });

  console.log('✅ Operational Expenses created');

  // ============================================================
  // 12. SALES TRANSACTIONS & PAYMENTS (Last 7 Days + Today)
  // ============================================================
  console.log('🛒 Generating realistic sales transactions...');

  // Define transaction templates
  const transactionTemplates = [
    // 1. Ojol isi bensin + rokok (Digital QRIS)
    {
      items: [
        { sku: 'FUEL-PERTALITE', qty: 3 }, // Rp 30.000
        { sku: 'RKK-AMILD16', qty: 1 },    // Rp 36.000
        { sku: 'MNM-TEHPUCUK', qty: 1 },   // Rp 4.000
      ],
      paymentMethod: 'DIGITAL' as const,
      customer: customerDanang,
      notes: 'Pembayaran via QRIS GoPay',
    },
    // 2. Belanja Sembako Mingguan Ibu Rumah Tangga (Cash)
    {
      items: [
        { sku: 'SMB-RAMOS5KG', qty: 1 },     // Rp 73.000
        { sku: 'SMB-BIMOLI2L', qty: 1 },     // Rp 36.500
        { sku: 'SMB-TELUR1KG', qty: 1 },     // Rp 28.500
        { sku: 'SMB-GULAKU1KG', qty: 1 },    // Rp 17.500
        { sku: 'KBR-SUNLIGHT750', qty: 1 },  // Rp 17.500
        { sku: 'MIE-INDOMIEGRG', qty: 5 },   // Rp 17.500
      ],
      paymentMethod: 'CASH' as const,
      customer: customerSiti,
      notes: null,
    },
    // 3. Warung Makan Pak Haji Usman (Cash)
    {
      items: [
        { sku: 'SMB-RAMOS5KG', qty: 3 },    // Rp 219.000
        { sku: 'SMB-TELUR1KG', qty: 3 },    // Rp 85.500
        { sku: 'SMB-BIMOLI2L', qty: 2 },    // Rp 73.000
        { sku: 'SMB-SEGITIGA1KG', qty: 2 }, // Rp 26.000
        { sku: 'FUEL-PERTALITE', qty: 5 },  // Rp 50.000 (jerigen)
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUsman,
      notes: 'Pesanan langganan warung makan',
    },
    // 4. Pembeli Pom Mini Pertamax motor (Cash)
    {
      items: [
        { sku: 'FUEL-PERTAMAX', qty: 3.86 }, // Rp 50.000
        { sku: 'MNM-AQUA600', qty: 1 },      // Rp 3.500
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
    // 5. Anak sekolah jajan snack & minuman (Cash)
    {
      items: [
        { sku: 'SNK-CHITATO68G', qty: 1 },   // Rp 11.000
        { sku: 'MNM-ULTRACOK', qty: 1 },     // Rp 7.000
        { sku: 'SNK-BENGBENG', qty: 2 },     // Rp 5.000
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
    // 6. Belanja Rokok & Kopi (Cash)
    {
      items: [
        { sku: 'RKK-GGFILTER16', qty: 1 },   // Rp 31.000
        { sku: 'MNM-KAPALAPI', qty: 5 },     // Rp 10.000
        { sku: 'MNM-AQUA600', qty: 1 },      // Rp 3.500
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
    // 7. Pom Mini Pertalite 20rb (Cash)
    {
      items: [
        { sku: 'FUEL-PERTALITE', qty: 2 },   // Rp 20.000
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
    // 8. Beli Obat & Minyak Kayu Putih (QRIS)
    {
      items: [
        { sku: 'OBT-PANADOL500', qty: 1 },   // Rp 13.000
        { sku: 'OBT-MKP60ML', qty: 1 },      // Rp 26.000
        { sku: 'MNM-LEMIN600', qty: 1 },     // Rp 3.500
      ],
      paymentMethod: 'DIGITAL' as const,
      customer: customerUmum,
      notes: 'QRIS BCA',
    },
    // 9. Perlengkapan Mandi & Cuci (Cash)
    {
      items: [
        { sku: 'KBR-RINSOMOLTO', qty: 1 },   // Rp 22.500
        { sku: 'KBR-LIFEBUOY', qty: 2 },     // Rp 9.000
        { sku: 'KBR-PEPSODENT190', qty: 1 }, // Rp 15.000
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
    // 10. Indomie Borongan Kos-kosan (Digital)
    {
      items: [
        { sku: 'MIE-INDOMIEGRG', qty: 10 },  // Rp 35.000
        { sku: 'MIE-INDOMIESOTO', qty: 10 }, // Rp 35.000
        { sku: 'MNM-TEHBOTOL350', qty: 3 },  // Rp 13.500
      ],
      paymentMethod: 'DIGITAL' as const,
      customer: customerUmum,
      notes: 'QRIS ShopeePay',
    },
    // 11. Pom Mini Pertamax Mobil 150rb (Cash)
    {
      items: [
        { sku: 'FUEL-PERTAMAX', qty: 11.58 }, // Rp 150.000
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
    // 12. ATK & Buku Sekolah (Cash)
    {
      items: [
        { sku: 'ATK-SIDU38', qty: 5 },       // Rp 22.500
        { sku: 'ATK-STDAE7', qty: 3 },       // Rp 9.000
        { sku: 'SNK-SILVERQUEEN', qty: 1 },  // Rp 16.000
      ],
      paymentMethod: 'CASH' as const,
      customer: customerUmum,
      notes: null,
    },
  ];

  let invoiceCounter = 1001;
  let todayTotalCashSales = 0;

  // Generate sales for 7 days (day 6 ago to day 0 / today)
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const isToday = dayOffset === 0;
    const sessionForDay = isToday ? activeCashSession : cashSessions[6 - dayOffset];
    const txCount = isToday ? 24 : (12 + (6 - dayOffset) * 2); // 12 to 24 transactions per day

    for (let t = 0; t < txCount; t++) {
      const template = transactionTemplates[t % transactionTemplates.length];
      
      // Calculate realistic time of transaction
      const hour = 7 + Math.floor((t / txCount) * 14); // spread from 07:00 to 21:00
      const minute = (t * 17) % 60;
      const txDate = isToday ? new Date() : dateDaysAgo(dayOffset, hour);
      if (isToday) {
        txDate.setHours(hour, minute, 0, 0);
        // Don't set future hour for today
        const now = new Date();
        if (txDate > now) {
          txDate.setHours(now.getHours() - 1, minute, 0, 0);
        }
      } else {
        txDate.setMinutes(minute);
      }

      // Build items snapshot
      let subtotal = 0;
      let totalCost = 0;
      const saleItemsToCreate: any[] = [];

      for (const it of template.items) {
        const product = createdProducts[it.sku];
        if (!product) continue;

        const sellingPrice = Number(product.sellingPrice);
        const costPrice = Number(product.purchasePrice);
        const qty = it.qty;
        const itemSubtotal = Math.round(sellingPrice * qty);

        subtotal += itemSubtotal;
        totalCost += Math.round(costPrice * qty);

        saleItemsToCreate.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitName: product.unit.name,
          sellingPrice,
          costPrice,
          quantity: qty,
          subtotal: itemSubtotal,
          discount: 0,
          total: itemSubtotal,
          createdAt: txDate,
        });
      }

      const total = subtotal;
      invoiceCounter++;
      const invoiceNumber = `INV${txDate.getFullYear().toString().slice(-2)}${(txDate.getMonth() + 1).toString().padStart(2, '0')}${txDate.getDate().toString().padStart(2, '0')}-${invoiceCounter}`;

      const sale = await prisma.sale.create({
        data: {
          invoiceNumber,
          clientTransactionId: `CLIENT-TX-${invoiceNumber}`,
          cashierId: cashierUser.id,
          customerId: template.customer.id,
          cashSessionId: sessionForDay.id,
          subtotal,
          discountAmount: 0,
          taxAmount: 0,
          total,
          status: 'COMPLETED',
          notes: template.notes,
          createdAt: txDate,
          updatedAt: txDate,
        },
      });

      // Create SaleItems
      await prisma.saleItem.createMany({
        data: saleItemsToCreate.map(si => ({ ...si, saleId: sale.id })),
      });

      // Create Payment
      const paymentReceived = template.paymentMethod === 'CASH' 
        ? Math.ceil(total / 10000) * 10000 // rounded cash payment with change
        : total;

      await prisma.payment.create({
        data: {
          saleId: sale.id,
          method: template.paymentMethod,
          amount: total,
          amountReceived: template.paymentMethod === 'CASH' ? paymentReceived : null,
          change: template.paymentMethod === 'CASH' ? (paymentReceived - total) : null,
          reference: template.paymentMethod === 'DIGITAL' ? `QRIS-TRX-${invoiceNumber}` : null,
          createdAt: txDate,
        },
      });

      // Cash transaction & stock movement
      if (template.paymentMethod === 'CASH') {
        await prisma.cashTransaction.create({
          data: {
            cashSessionId: sessionForDay.id,
            type: 'SALE',
            amount: total,
            referenceId: sale.id,
            referenceType: 'SALE',
            description: `Penjualan ${sale.invoiceNumber}`,
            createdAt: txDate,
          },
        });

        if (isToday) {
          todayTotalCashSales += total;
        }
      }

      // Stock movements
      for (const item of saleItemsToCreate) {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: 'SALE',
            quantity: -item.quantity,
            stockBefore: Number(createdProducts[item.productSku]?.currentStock || 100) + item.quantity,
            stockAfter: Number(createdProducts[item.productSku]?.currentStock || 100),
            referenceId: sale.id,
            referenceType: 'SALE',
            userId: cashierUser.id,
            createdAt: txDate,
          },
        });
      }
    }
  }

  // Update active session expected balance
  const activeExpectedBalance = 300000 + todayTotalCashSales - 35000; // Opening + Cash Sales - Expense
  await prisma.cashSession.update({
    where: { id: activeCashSession.id },
    data: { expectedBalance: activeExpectedBalance },
  });

  console.log(`✅ Seeded 120+ sales transactions across 7 days (Today Cash Sales: Rp ${todayTotalCashSales.toLocaleString('id-ID')})`);

  // ============================================================
  // 13. SAMPLE RETURN
  // ============================================================
  const sampleSale = await prisma.sale.findFirst({
    where: { status: 'COMPLETED' },
    include: { items: true },
  });

  if (sampleSale && sampleSale.items.length > 0) {
    const returnItem = sampleSale.items[0];
    const ret = await prisma.return.create({
      data: {
        returnNumber: 'RET260822-001',
        saleId: sampleSale.id,
        userId: adminUser.id,
        totalRefund: Number(returnItem.sellingPrice),
        reason: 'Salah varian rasa yang dibeli pembeli (tukar barang sejenis)',
        createdAt: dateDaysAgo(1, 16),
      },
    });

    await prisma.returnItem.create({
      data: {
        returnId: ret.id,
        productId: returnItem.productId,
        productName: returnItem.productName,
        quantity: 1,
        sellingPrice: returnItem.sellingPrice,
        subtotal: returnItem.sellingPrice,
        condition: 'GOOD',
        createdAt: dateDaysAgo(1, 16),
      },
    });

    console.log('✅ Sample Return created');
  }

  // ============================================================
  // 14. AUDIT LOGS
  // ============================================================
  const auditEntries = [
    {
      userId: ownerUser.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: ownerUser.id,
      description: 'Owner login berhasil via Desktop Chrome',
      createdAt: dateDaysAgo(0, 7),
    },
    {
      userId: cashierUser.id,
      action: 'CASH_SESSION_OPEN',
      entityType: 'CASH_SESSION',
      entityId: activeCashSession.id,
      newValues: { openingBalance: 300000 },
      description: 'Kasir Siti Rahma membuka shift pagi dengan modal Rp 300.000',
      createdAt: todayOpenTime,
    },
    {
      userId: adminUser.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'PRODUCT',
      entityId: createdProducts['MIE-INDOMIEGRG'].id,
      oldValues: { currentStock: 162 },
      newValues: { currentStock: 160, difference: -2 },
      description: 'Penyesuaian stok Indomie Goreng: 162 → 160 (-2 bungkus rusak kemasan)',
      createdAt: dateDaysAgo(1, 15),
    },
    {
      userId: ownerUser.id,
      action: 'PRICE_CHANGE',
      entityType: 'PRODUCT',
      entityId: createdProducts['FUEL-PERTAMAX'].id,
      oldValues: { sellingPrice: 12500 },
      newValues: { sellingPrice: 12950 },
      description: 'Penyesuaian harga jual Pertamax mengikuti rilis harga Pertamina',
      createdAt: dateDaysAgo(3, 8),
    },
  ];

  for (const log of auditEntries) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('✅ Audit Logs created');

  console.log('\n======================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('📊 Dashboard & Reports Data Ready:');
  console.log('   - 34 Products (Retail, Sembako, Rokok, Minuman, BBM Pom Mini)');
  console.log('   - 4 Low Stock Products Alert (Biosolar, Coca-Cola, Djarum Super, Pepsodent)');
  console.log('   - 120+ Real Sales Transactions (Past 7 Days + Today)');
  console.log('   - 6 Operational Expenses');
  console.log('   - 4 Supplier Purchases (Rp 3.800.000+ Outstanding Debt)');
  console.log('   - 7 Cash Sessions (1 Active Open Shift Today)');
  console.log('\n🔑 Login Credentials:');
  console.log('   - Owner  : owner  / admin123');
  console.log('   - Admin  : admin  / admin123');
  console.log('   - Kasir  : kasir  / admin123');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
