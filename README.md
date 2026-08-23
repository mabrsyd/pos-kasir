# POS Toko Retail + Pom Mini (pos-kasir)

Aplikasi Point of Sale (POS) & Manajemen Toko Retail Tradisional / Toko Madura + SPBU Mini (Pom Mini) yang dirancang untuk kecepatan operasional, keandalan data, serta kemampuan offline-first.

## 🚀 Fitur Utama

- **POS Retail & Barcode / Manual Search**: Pencarian cepat berbasis nama, SKU, barcode, dan kategori.
- **Modul Pom Mini (Fuel)**: Mendukung penjualan bahan bakar berbasis liter maupun nominal (Rupiah) dengan konversi otomatis dan stok desimal.
- **Offline-First & Auto-Sync**: Menggunakan IndexedDB (Dexie.js) dan sync queue sehingga transaksi kasir tetap berjalan lancar saat internet terputus.
- **Manajemen Kasir & Sesi Kas**: Buka/tutup shift kasir, hitung selisih kas fisik vs sistem, pencatatan kas masuk/keluar (cash in/out).
- **Inventori & Mutasi Stok**: Tracking stok real-time, stok opname / adjustment, riwayat pergerakan stok (Stock Movement).
- **Pembelian & Hutang Supplier**: Manajemen order pembelian (PO), penerimaan barang, dan pelacakan hutang dagang.
- **Retur & Void Aman**: Pembatalan dan pengembalian barang dengan audit log dan pemulihan stok/kas otomatis.
- **Laporan Finansial & Bisnis**: Monitoring omzet, HPP (COGS), laba kotor, biaya operasional, dan estimasi laba bersih.
- **Role-Based Access Control (RBAC)**: Hak akses berjenjang untuk OWNER, ADMIN, dan CASHIER.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js (App Router), TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State & Data Fetching**: TanStack Query, Zustand
- **Offline Storage**: Dexie.js (IndexedDB)
- **App Format**: Progressive Web App (PWA)

### Backend
- **Runtime & Server**: Node.js, Express.js, TypeScript
- **ORM**: Prisma ORM
- **Database**: MySQL 8+

## 📁 Struktur Repositori

```text
.
├── backend/            # Express.js REST API & Prisma schema
├── frontend/           # Next.js PWA Client
├── docs/               # Spesifikasi lengkap (PRD, Arsitektur, ERD, API, dll.)
└── AGENTS.md           # Aturan kerja & source of truth proyek
```

## ⚙️ Menjalankan Project

### Backend
```bash
cd backend
npm install
cp .env.example .env     # Sesuaikan konfigurasi DATABASE_URL
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.
