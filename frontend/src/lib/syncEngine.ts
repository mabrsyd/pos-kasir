import { db } from './db';
import api from './api';
import { v4 as uuidv4 } from 'uuid';

class SyncEngine {
  private syncInProgress = false;

  async enqueueOperation(operationType: string, payload: any) {
    const clientTransactionId = uuidv4();
    
    await db.syncQueue.add({
      clientTransactionId,
      operationType: operationType as any,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });

    // Attempt to sync immediately
    this.triggerSync();
    
    return clientTransactionId;
  }

  async triggerSync() {
    if (this.syncInProgress || !navigator.onLine) return;
    this.syncInProgress = true;

    try {
      const pendingOps = await db.syncQueue
        .where('status')
        .anyOf(['PENDING', 'FAILED'])
        .toArray();

      if (pendingOps.length === 0) return;

      const deviceId = localStorage.getItem('deviceId') || 'web-client';

      // Send batch to server
      const response = await api.post('/sync/push', {
        operations: pendingOps.map(op => ({
          clientTransactionId: op.clientTransactionId,
          operationType: op.operationType,
          payload: op.payload,
          deviceId,
        })),
      });

      const results = response.data; // Array of { clientTransactionId, status, error }

      // Update local status
      for (const result of results) {
        if (result.status === 'SYNCED') {
          await db.syncQueue.delete(result.clientTransactionId);
        } else {
          await db.syncQueue.update(result.clientTransactionId, {
            status: result.status,
            errorMessage: result.error,
          });
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Periodic sync checks
  startPeriodicSync(intervalMs = 60000) {
    setInterval(() => this.triggerSync(), intervalMs);
    
    // Also sync when coming back online
    window.addEventListener('online', () => {
      console.log('Back online, triggering sync...');
      this.triggerSync();
    });
  }
}

export const syncEngine = new SyncEngine();
