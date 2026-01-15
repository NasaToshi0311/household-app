import { useEffect, useState, useCallback } from "react";
import { upsertExpense, getPendingExpenses, hardDeleteExpense, markSynced } from "./db";
import type { Expense, ExpenseInput } from "./db";
import { useOnline } from "./hooks/useOnline";
import { getApiBaseUrl, getApiKey } from "./config/api";
import SummaryPage from "./pages/SummaryPage";
import { syncExpenses } from "./api/expenses";
import ApiUrlBox from "./components/ApiUrlBox";
import PendingList from "./components/PendingList";
import ExpenseForm from "./components/ExpenseForm";
import ConfirmDialog from "./components/ConfirmDialog";
import * as S from "./ui/styles.ts";


export default function App() {
  const [items, setItems] = useState<Expense[]>([]);

  const [tab, setTab] = useState<"input" | "summary">("input");
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  const [configured, setConfigured] = useState(() => {
    return !!getApiBaseUrl().trim() && !!getApiKey().trim();
  });

  const refresh = useCallback(async () => {
    setItems(await getPendingExpenses());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function sync() {
    if (syncing) return;
    setSyncing(true);

    try {
      const latest = await getPendingExpenses();
      if (latest.length === 0) {
        alert("未送信がありません");
      } else {
        const result = await syncExpenses(latest);
        await markSynced(result.ok_uuids);
        await refresh();
        alert(`同期完了（成功 ${result.ok_uuids.length} / 失敗 ${result.ng_uuids.length}）`);
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || e?.message?.includes("timeout")) {
        const apiUrl = getApiBaseUrl();
        alert(`同期失敗: タイムアウト\n\n確認事項:\n1. PC側のサーバーが起動しているか\n2. PCとスマホが同じネットワークに接続されているか\n3. 同期先URLが正しいか（${apiUrl || "未設定"}）\n4. ファイアウォールがブロックしていないか`);
      } else {
        alert(e?.message ?? "同期失敗");
      }
    } finally {
      setSyncing(false);
    }
  }

  const tabBtn = (key: "input" | "summary", label: string) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1,
        padding: "12px 20px",
        borderRadius: tab === key ? "12px 12px 0 0" : "12px 12px 0 0",
        border: "none",
        borderTop: tab === key ? "3px solid #16a34a" : "3px solid transparent",
        borderLeft: tab === key ? "2px solid #e5e7eb" : "none",
        borderRight: tab === key ? "2px solid #e5e7eb" : "none",
        background: tab === key ? "#ffffff" : "#ffffff",
        color: tab === key ? "#1f2937" : "#6b7280",
        fontWeight: tab === key ? 700 : 600,
        fontSize: 16,
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        zIndex: tab === key ? 10 : 1,
        transform: tab === key ? "translateY(-2px)" : "translateY(0)",
        boxShadow: tab === key ? "0 -2px 8px rgba(0,0,0,0.05)" : "none",
      }}
      onMouseEnter={(e) => {
        if (tab !== key) {
          e.currentTarget.style.background = "#f9fafb";
          e.currentTarget.style.color = "#374151";
        }
      }}
      onMouseLeave={(e) => {
        if (tab !== key) {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.color = "#6b7280";
        }
      }}
    >
      {label}
    </button>
  );

  if (!configured) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>家計簿（スマホ）</h1>
        <div style={S.card}>
          <ApiUrlBox
            itemsCount={items.length}
            online={online}
            syncing={syncing}
            onSync={sync}
            onConfiguredChange={(isConfigured) => {
              setConfigured(isConfigured);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>家計簿（スマホ）</h1>
      <div style={S.card}>
        <ApiUrlBox
          itemsCount={items.length}
          online={online}
          syncing={syncing}
          onSync={sync}
          onConfiguredChange={(isConfigured) => {
            setConfigured(isConfigured);
          }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{
          display: "flex",
          gap: 0,
          background: "#ffffff",
          borderRadius: "14px 14px 0 0",
          padding: "4px 4px 0 4px",
          borderTop: "2px solid #e5e7eb",
          borderLeft: "2px solid #e5e7eb",
          borderRight: "2px solid #e5e7eb",
        }}>
          {tabBtn("input", "入力")}
          {tabBtn("summary", "集計")}
        </div>
      </div>

      <div style={{ 
        marginTop: 0,
        background: "#ffffff",
        borderRadius: "0 0 16px 16px",
        border: "2px solid #e5e7eb",
        borderTop: "none",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        minHeight: "400px",
      }}>
        {tab === "summary" ? (
          <SummaryPage />
        ) : (
          <>
            <div style={{ ...S.card, border: "none", boxShadow: "none", padding: 0 }}>
              <ExpenseForm
                onAdd={async (item) => {
                  const input: ExpenseInput = {
                    client_uuid: item.client_uuid,
                    date: item.date,
                    amount: item.amount,
                    category: item.category,
                    note: item.note,
                    paid_by: item.paid_by,
                  };
                  await upsertExpense(input);
                  await refresh();
                }}
              />
            </div>

            <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
            <div style={{ ...S.card, border: "none", boxShadow: "none", padding: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#1f2937" }}>未送信</h2>
              <PendingList
                items={items}
                onDeleteOne={async (id) => {
                  setConfirmDialog({
                    message: "未送信データを削除しますか？",
                    onConfirm: async () => {
                      await hardDeleteExpense(id);
                      await refresh();
                      setConfirmDialog(null);
                    },
                  });
                }}
              />
            </div>
          </>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
