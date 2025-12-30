import { openDB } from "idb";

export type PendingExpense = {
  client_uuid: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
  paid_by: "me" | "her";
};

export const dbPromise = openDB("household-db", 1, {
  upgrade(db) {
    db.createObjectStore("pending", { keyPath: "client_uuid" });
  },
});

export async function addPending(item: PendingExpense) {
  const db = await dbPromise;
  await db.put("pending", item);
}

export async function getAllPending(): Promise<PendingExpense[]> {
  const db = await dbPromise;
  return db.getAll("pending");
}

export async function removePending(ids: string[]) {
  const db = await dbPromise;
  for (const id of ids) {
    await db.delete("pending", id);
  }
}

export async function removeOnePending(id: string) {
    const db = await dbPromise;
    await db.delete("pending", id);
  }
