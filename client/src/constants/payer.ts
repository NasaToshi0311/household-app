// src/constants/payer.ts
export type PaidBy = "me" | "her";

export const payerLabel: Record<PaidBy, string> = {
  me: "A",
  her: "B",
};
