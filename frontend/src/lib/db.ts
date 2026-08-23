import Dexie, { Table } from 'dexie';

export interface OfflineProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string;
  unitId: string;
  productType: 'RETAIL' | 'FUEL' | 'OTHER';
  sellingPrice: number;
  purchasePrice: number;
  minimumStock: number;
  currentStock: number;
  isActive: boolean;
  updatedAt: string;
}

export interface OfflineCategory {
  id: string;
  name: string;
}

export interface OfflineUnit {
  id: string;
  name: string;
}

export interface PendingSyncOperation {
  clientTransactionId: string;
  operationType: 'CREATE_SALE' | 'CREATE_RETURN' | 'CASH_TRANSACTION' | 'VOID_SALE' | 'EXPENSE';
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFLICT';
  errorMessage?: string;
  createdAt: string;
  retryCount: number;
}

export interface LocalCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  isFuel: boolean;
}

export class PosDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  categories!: Table<OfflineCategory, string>;
  units!: Table<OfflineUnit, string>;
  syncQueue!: Table<PendingSyncOperation, string>;
  cart!: Table<LocalCartItem, string>; // Store cart offline temporarily

  constructor() {
    super('PosDatabase');
    
    this.version(1).stores({
      products: 'id, name, sku, barcode, categoryId, isActive',
      categories: 'id, name',
      units: 'id, name',
      syncQueue: 'clientTransactionId, status, operationType, createdAt',
      cart: 'productId',
    });
  }
}

export const db = new PosDatabase();
