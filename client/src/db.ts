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
    indexes: { "by-status": string; "by-date": string };
  };
  pending: {
    key: string;
    value: PendingExpense;
  };
  meta: {
    key: string;
    value: { key: string; value: boolean };
  };
}

export const dbPromise = openDB<HouseholdDB>("household-db", 3, {
  upgrade(db, oldVersion) {
    if (oldVersion < 2) {
      // version 1から2へのアップグレード
      // スキーマ変更のみ: expensesストアとindex(by-status)を作成
      const expensesStore = db.createObjectStore("expenses", {
        keyPath: "client_uuid",
      });
      expensesStore.createIndex("by-status", "status");
      // pendingストアは削除しない（安全のため残す）
      // metaストアを作成（migration状態の永続化用）
      db.createObjectStore("meta", { keyPath: "key" });
    }
    
    if (oldVersion < 3) {
      // version 2から3へのアップグレード
      // 日付範囲クエリ用のインデックスを追加
      const tx = db.transaction("expenses", "readwrite");
      const expensesStore = tx.objectStore("expenses");
      
      // インデックスが存在しない場合のみ作成
      if (!expensesStore.indexNames.contains("by-date")) {
        expensesStore.createIndex("by-date", "date");
      }
    }
  },
}).then(async (db) => {
  // DBオープン後のデータ移行処理（1回だけ実行）
  const migrationDone = await db.get("meta", "migration_v2_done");
  if (!migrationDone) {
    await migratePendingToExpenses(db);
    await db.put("meta", { key: "migration_v2_done", value: true });
  }
  return db;
});

/**
 * pendingストアからexpensesストアへのデータ移行
 * （DBオープン後の通常コードで実行）
 */
async function migratePendingToExpenses(db: Awaited<typeof dbPromise>) {
  try {
    // expensesが空 かつ pendingが存在する場合のみ移行
    const expensesCount = await db.count("expenses");
    if (expensesCount > 0) {
      // 既にデータが存在する場合は移行しない
      return;
    }

    if (!db.objectStoreNames.contains("pending")) {
      // pendingストアが存在しない場合は移行しない
      return;
    }

    // pendingのgetAll()を実行
    const pendingItems = await db.getAll("pending");
    if (pendingItems.length === 0) {
      // データがない場合は移行しない
      return;
    }

    // 各itemをexpensesにput
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

    // 移行完了後はpendingを参照しない（削除はしない）
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
 * 明細を論理削除（op="delete", status="pending"に更新）
 * 次回同期時にサーバーへ送られ、deleted_atが立つ
 */
export async function markDeleteExpense(client_uuid: string): Promise<void> {
  const db = await dbPromise;
  const expense = await db.get("expenses", client_uuid);
  if (!expense) {
    throw new Error(`Expense not found: ${client_uuid}`);
  }

  const now = new Date().toISOString();
  await db.put("expenses", {
    ...expense,
    op: "delete",
    status: "pending",
    updated_at: now,
  });
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
 * IndexedDBの範囲クエリを使用して効率的に検索
 */
export async function getExpensesByRange(
  from: string,
  to: string
): Promise<Expense[]> {
  const db = await dbPromise;
  const tx = db.transaction("expenses", "readonly");
  const index = tx.store.index("by-date");

  // 日付範囲でクエリ（from <= date <= to）
  // IDBKeyRange.bound(from, to, false, false) は [from, to] の範囲
  const range = IDBKeyRange.bound(from, to, false, false);
  const items = await index.getAll(range);

  // op=="delete"のものを除外（範囲クエリでは日付での絞り込みのみ）
  return items.filter((expense) => expense.op !== "delete");
}

/**
 * 未同期件数を取得
 */
export async function getPendingCount(): Promise<number> {
  const db = await dbPromise;
  const index = db.transaction("expenses").store.index("by-status");
  return index.count("pending");
}
