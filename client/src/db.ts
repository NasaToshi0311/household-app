import { openDB } from "idb";

export type PendingExpense = {
  client_uuid: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
  paid_by: "me" | "her";
  op: "upsert" | "delete";
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
  const tx = db.transaction("pending", "readwrite");
  const store = tx.objectStore("pending");
  await Promise.all(ids.map((id) => store.delete(id)));
  await tx.done;
}

export async function removeOnePending(id: string) {
    const db = await dbPromise;
    await db.delete("pending", id);
  }
