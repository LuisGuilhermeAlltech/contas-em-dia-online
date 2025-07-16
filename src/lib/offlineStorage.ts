// Gerenciamento de armazenamento offline usando IndexedDB
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  contas: {
    key: string;
    value: {
      id: string;
      descricao: string;
      empresa: string;
      valor_total: number;
      vencimento: string;
      total_pago: number;
      created_at: string;
      synced: boolean;
      operation: 'insert' | 'update' | 'delete';
    };
  };
  fornecedores: {
    key: string;
    value: {
      id: string;
      nome: string;
      observacao?: string;
      empresa: string;
      created_at: string;
      synced: boolean;
      operation: 'insert' | 'update' | 'delete';
    };
  };
  pagamentos: {
    key: string;
    value: {
      id: string;
      conta_id: string;
      valor: number;
      data: string;
      created_at: string;
      synced: boolean;
      operation: 'insert' | 'update' | 'delete';
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<OfflineDB> | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<OfflineDB>('contas-offline-db', 1, {
      upgrade(db) {
        // Criar stores para cada tabela
        if (!db.objectStoreNames.contains('contas')) {
          db.createObjectStore('contas', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fornecedores')) {
          db.createObjectStore('fornecedores', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pagamentos')) {
          db.createObjectStore('pagamentos', { keyPath: 'id' });
        }
      },
    });

    return this.db;
  }

  // Salvar dados offline
  async saveOffline<T extends keyof OfflineDB>(
    table: T,
    data: OfflineDB[T]['value']
  ): Promise<void> {
    const db = await this.init();
    await db.put(table as any, data);
  }

  // Recuperar dados offline
  async getOffline<T extends keyof OfflineDB>(
    table: T,
    empresa?: string
  ): Promise<OfflineDB[T]['value'][]> {
    const db = await this.init();
    const allData = await db.getAll(table as any);
    
    if (empresa) {
      return allData.filter((item: any) => item.empresa === empresa);
    }
    
    return allData;
  }

  // Recuperar dados não sincronizados
  async getUnsyncedData<T extends keyof OfflineDB>(
    table: T
  ): Promise<OfflineDB[T]['value'][]> {
    const db = await this.init();
    const allData = await db.getAll(table as any);
    return allData.filter(item => !item.synced);
  }

  // Marcar como sincronizado
  async markSynced<T extends keyof OfflineDB>(
    table: T,
    id: string
  ): Promise<void> {
    const db = await this.init();
    const item = await db.get(table as any, id);
    if (item) {
      item.synced = true;
      await db.put(table as any, item);
    }
  }

  // Limpar dados sincronizados
  async clearSynced<T extends keyof OfflineDB>(table: T): Promise<void> {
    const db = await this.init();
    const allData = await db.getAll(table as any);
    const syncedItems = allData.filter(item => item.synced);
    
    for (const item of syncedItems) {
      await db.delete(table as any, item.id);
    }
  }

  // Verificar se existe dados offline
  async hasOfflineData(): Promise<boolean> {
    const db = await this.init();
    const contasCount = await db.count('contas');
    const fornecedoresCount = await db.count('fornecedores');
    const pagamentosCount = await db.count('pagamentos');
    
    return contasCount > 0 || fornecedoresCount > 0 || pagamentosCount > 0;
  }

  // Limpar todos os dados offline
  async clearAllOfflineData(): Promise<void> {
    const db = await this.init();
    await db.clear('contas');
    await db.clear('fornecedores');
    await db.clear('pagamentos');
  }
}

export const offlineStorage = new OfflineStorage();