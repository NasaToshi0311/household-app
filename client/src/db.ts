import { openDB, type DBSchema } from "idb";

export type Expense = {
  client_uuid: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
  paid_by: "me" | "her";
  op: "upsert" | "delete";
  status: "pending" | "synced";
  updated_at: string; // ISO string
};

// 後方互換性のため
export type PendingExpense = {
  client_uuid: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
  paid_by: "me" | "her";
  op: "upsert" | "delete";
};

interface HouseholdDB extends DBSchema {
  expenses: {
    key: string;
    value: Expense;
    indexes: { "by-status": string };
  };
  pending: {
    key: string;
    value: PendingExpense;
  };
}

let migrationDone = false;

export const dbPromise = openDB<HouseholdDB>("household-db", 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 2) {
      // version 1から2へのアップグレード
      // expensesストアを作成
      const expensesStore = db.createObjectStore("expenses", {
        keyPath: "client_uuid",
      });
      expensesStore.createIndex("by-status", "status");
    }
  },
}).then(async (db) => {
  // 初回のみ移行処理を実行
  if (!migrationDone && db.objectStoreNames.contains("pending")) {
    migrationDone = true;
    await migratePendingToExpenses(db);
  }
  return db;
});

// pendingストアからexpensesストアへの移行を実行
async function migratePendingToExpenses(db: Awaited<typeof dbPromise>) {
  try {
    // 古いバージョンのDBを直接開いてpendingデータを取得
    const oldDbRequest = indexedDB.open("household-db", 1);
    const oldDb: IDBDatabase = await new Promise((resolve, reject) => {
      oldDbRequest.onsuccess = () => resolve(oldDbRequest.result);
      oldDbRequest.onerror = () => reject(oldDbRequest.error);
    });

    const pendingStore = oldDb.transaction("pending", "readonly").objectStore("pending");
    const getAllRequest = pendingStore.getAll();
    
    const pendingItems: PendingExpense[] = await new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });

    oldDb.close();

    if (pendingItems.length > 0) {
      // expensesストアにデータを移行
      const now = new Date().toISOString();
      const tx = db.transaction("expenses", "readwrite");
      for (const item of pendingItems) {
        await tx.store.put({
          ...item,
          status: "pending" as const,
          updated_at: now,
        });
      }
      await tx.done;
    }

    // pendingストアを削除（DBを再作成する必要があるため、実際には次のDBオープン時に削除される）
    // 注意: idb v8ではストアを直接削除できないため、アプリケーション側でpendingストアは使用しない
  } catch (error) {
    console.error("Migration failed:", error);
    // 移行に失敗しても続行
  }
}

// 入力データからExpenseを作成（upsert用）
export type ExpenseInput = {
  client_uuid: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
  paid_by: "me" | "her";
};

/**
 * 支出を追加または更新（upsert）
 */
export async function upsertExpense(input: ExpenseInput): Promise<void> {
  const db = await dbPromise;
  const now = new Date().toISOString();
  const expense: Expense = {
    ...input,
    op: "upsert",
    status: "pending",
    updated_at: now,
  };
  await db.put("expenses", expense);
}

/**
 * 未送信の支出一覧を取得
 */
export async function getPendingExpenses(): Promise<Expense[]> {
  const db = await dbPromise;
  const index = db.transaction("expenses").store.index("by-status");
  return index.getAll("pending");
}

/**
 * 入力取り消し用の物理削除
 */
export async function hardDeleteExpense(client_uuid: string): Promise<void> {
  const db = await dbPromise;
  await db.delete("expenses", client_uuid);
}

/**
 * 同期成功したUUIDのステータスを"synced"に更新
 */
export async function markSynced(okUuids: string[]): Promise<void> {
  if (okUuids.length === 0) return;

  const db = await dbPromise;
  const tx = db.transaction("expenses", "readwrite");
  const store = tx.store;

  const now = new Date().toISOString();

  for (const uuid of okUuids) {
    const expense = await store.get(uuid);
    if (expense) {
      await store.put({
        ...expense,
        status: "synced",
        updated_at: now,
      });
    }
  }

  await tx.done;
}

/**
 * 期間で絞り込んで支出を取得（op=="delete"は除外）
 */
export async function getExpensesByRange(
  from: string,
  to: string
): Promise<Expense[]> {
  const db = await dbPromise;
  const all = await db.getAll("expenses");

  return all.filter((expense) => {
    if (expense.op === "delete") return false;
    return expense.date >= from && expense.date <= to;
  });
}

/**
 * 未同期件数を取得
 */
export async function getPendingCount(): Promise<number> {
  const db = await dbPromise;
  const index = db.transaction("expenses").store.index("by-status");
  const pending = await index.getAll("pending");
  return pending.length;
}
