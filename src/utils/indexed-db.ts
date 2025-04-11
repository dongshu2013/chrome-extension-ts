export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  conversationId: string;
  status?: 'pending' | 'completed' | 'error';
}

export class ConversationDatabase {
  private db: IDBDatabase | null = null;

  constructor(private dbName: string = 'AIAssistantDB', private version: number = 1) {}

  async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create conversations object store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          conversationStore.createIndex('conversationId', 'conversationId', { unique: false });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create messages object store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          messageStore.createIndex('conversationId', 'conversationId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('role', 'role', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject(new Error('Error opening IndexedDB'));
      };
    });
  }

  private async ensureDatabase(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.openDatabase();
    }
    return this.db!;
  }

  async saveMessage(message: ChatMessage): Promise<number> {
    await this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.add(message);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(new Error('Error saving message'));
      };
    });
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    await this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);

      request.onsuccess = () => {
        resolve(request.result as ChatMessage[]);
      };

      request.onerror = () => {
        reject(new Error('Error retrieving messages'));
      };
    });
  }

  async updateMessageStatus(
    messageId: number, 
    status: 'pending' | 'completed' | 'error'
  ): Promise<void> {
    await this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.get(messageId);

      request.onsuccess = () => {
        const message = request.result;
        if (message) {
          message.status = status;
          const updateRequest = store.put(message);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Error updating message'));
        } else {
          reject(new Error('Message not found'));
        }
      };

      request.onerror = () => {
        reject(new Error('Error retrieving message'));
      };
    });
  }

  async clearConversation(conversationId: string): Promise<void> {
    await this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.openCursor(conversationId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Error clearing conversation'));
      };
    });
  }
}

// Singleton instance
export const conversationDB = new ConversationDatabase();
