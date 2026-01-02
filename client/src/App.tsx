import { useEffect, useState, useCallback } from "react";
import { addPending, getAllPending, removePending, removeOnePending } from "./db";
import type { PendingExpense } from "./db";
import { useOnline } from "./hooks/useOnline";
import SummaryPage from "./pages/SummaryPage";
import { syncExpenses } from "./api/expenses";
import ApiUrlBox from "./components/ApiUrlBox";
import PendingList from "./components/PendingList";
import ExpenseForm from "./components/ExpenseForm";
import ConfirmDialog from "./components/ConfirmDialog";
import MessageBox from "./components/MessageBox";
import * as S from "./ui/styles.ts";


export default function App() {
  const [items, setItems] = useState<PendingExpense[]>([]);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>("");

  const [tab, setTab] = useState<"input" | "summary">("input");
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  const refresh = useCallback(async () => {
    setItems(await getAllPending());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function sync() {
    if (syncing) return;
    setSyncing(true);

    try {
      const latest = await getAllPending();
      if (latest.length === 0) {
        setMessage({ text: "未送信データがありません", type: "info" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const result = await syncExpenses(latest);
        await removePending(result.ok_uuids);
        await refresh();
        const successCount = result.ok_uuids.length;
        const failCount = result.ng_uuids.length;
        if (failCount === 0) {
          setMessage({ 
            text: `同期完了\n成功: ${successCount}件`, 
            type: "success" 
          });
        } else {
          setMessage({ 
            text: `同期完了\n成功: ${successCount}件\n失敗: ${failCount}件`, 
            type: failCount > successCount ? "error" : "warning" 
          });
        }
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setMessage({ text: "同期失敗: タイムアウト", type: "error" });
      } else {
        setMessage({ text: e?.message ?? "同期失敗", type: "error" });
      }
      setTimeout(() => setMessage(null), 5000);
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
        borderTop: tab === key ? "3px solid #e0e0e0" : "3px solid transparent",
        borderLeft: tab === key ? "2px solid #e0e0e0" : "none",
        borderRight: tab === key ? "2px solid #e0e0e0" : "none",
        background: tab === key 
          ? "#ffffff" 
          : "rgba(156, 163, 175, 0.3)",
        color: tab === key ? "#1f2937" : "#6b7280",
        fontWeight: tab === key ? 800 : 600,
        fontSize: 16,
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        zIndex: tab === key ? 10 : 1,
        transform: tab === key ? "translateY(-2px)" : "translateY(0)",
        boxShadow: tab === key 
          ? "0 -2px 8px rgba(0,0,0,0.1)" 
          : "none",
        filter: tab === key ? "none" : "grayscale(100%)",
        opacity: tab === key ? 1 : 0.7,
      }}
      onMouseEnter={(e) => {
        if (tab !== key) {
          e.currentTarget.style.opacity = "0.9";
          e.currentTarget.style.filter = "grayscale(80%)";
        }
      }}
      onMouseLeave={(e) => {
        if (tab !== key) {
          e.currentTarget.style.opacity = "0.7";
          e.currentTarget.style.filter = "grayscale(100%)";
        }
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={S.page}>
      <h1 style={S.h1}>家計簿（スマホ）</h1>
      <div style={S.card}>
        <ApiUrlBox
          itemsCount={items.length}
          online={online}
          syncing={syncing}
          onSync={sync}
          onBaseUrlChange={(url) => setApiBaseUrlState(url)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{
          display: "flex",
          gap: 0,
          background: "#ffffff",
          borderRadius: "14px 14px 0 0",
          padding: "4px 4px 0 4px",
          borderTop: "2px solid #e0e0e0",
          borderLeft: "2px solid #e0e0e0",
          borderRight: "2px solid #e0e0e0",
        }}>
          {tabBtn("input", "入力")}
          {tabBtn("summary", "集計")}
        </div>
      </div>

      <div style={{ 
        marginTop: 0,
        background: "#ffffff",
        borderRadius: "0 0 16px 16px",
        border: "2px solid #e0e0e0",
        borderTop: "none",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        minHeight: "400px",
      }}>
        {tab === "summary" ? (
          <SummaryPage baseUrl={apiBaseUrl} />
        ) : (
          <>
            <div style={{ ...S.card, border: "none", boxShadow: "none", padding: 0 }}>
              <ExpenseForm
                onAdd={async (item) => {
                  await addPending({ ...item, op: "upsert" });
                  await refresh();
                }}
              />
            </div>

            <hr style={{ margin: "20px 0", border: "none", borderTop: "2px solid #e5e7eb" }} />
            <div style={{ ...S.card, border: "none", boxShadow: "none", padding: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#1f2937" }}>未送信</h2>
              <PendingList
                items={items}
                onDeleteOne={async (id) => {
                  setConfirmDialog({
                    message: "未送信データを削除しますか？\n\nこの操作は取り消せません。",
                    onConfirm: async () => {
                      await removeOnePending(id);
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

      {message && (
        <MessageBox
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  );
}
