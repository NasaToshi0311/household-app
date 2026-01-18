import { useEffect, useState, useCallback } from "react";
import { upsertExpense, getPendingExpenses, hardDeleteExpense, markSynced } from "./db";
import type { Expense, ExpenseInput } from "./db";
import { useOnline } from "./hooks/useOnline";
import { getApiBaseUrl, getApiKey, isSetupViaQr, clearSetup } from "./config/api";
import SummaryPage from "./pages/SummaryPage";
import { syncExpenses } from "./api/expenses";
import ApiUrlBox from "./components/ApiUrlBox";
import PendingList from "./components/PendingList";
import ExpenseForm from "./components/ExpenseForm";
import ConfirmDialog from "./components/ConfirmDialog";
import * as S from "./ui/styles.ts";

export default function App() {
  const [items, setItems] = useState<Expense[]>([]);
  const [, forceRender] = useState(0); // storage更新後の再レンダリング用

  const [tab, setTab] = useState<"input" | "summary">("input");
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // storageから毎回計算（stateで持たない）
  const apiBaseUrl = getApiBaseUrl().trim();
  const apiKey = getApiKey().trim();
  const configured = !!apiBaseUrl && !!apiKey;
  const authorized = configured && isSetupViaQr();

  const refresh = useCallback(async () => {
    setItems(await getPendingExpenses());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ApiUrlBoxで設定が変わったら再レンダリング
  const handleConfiguredChange = useCallback(() => {
    forceRender((v) => v + 1);
  }, []);

  function handleReset() {
    if (confirm("設定をリセットしますか？この操作は取り消せません。")) {
      clearSetup();
      handleConfiguredChange();
    }
  }

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
        alert(
          `同期失敗: タイムアウト\n\n確認事項:\n` +
            `1. PC側のサーバーが起動しているか\n` +
            `2. PCとスマホが同じネットワークに接続されているか\n` +
            `3. 同期先URLが正しいか（${apiUrl || "未設定"}）\n` +
            `4. ファイアウォールがブロックしていないか`
        );
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
        borderRadius: "12px 12px 0 0",
        border: "none",
        borderTop: tab === key ? "3px solid #16a34a" : "3px solid transparent",
        borderLeft: tab === key ? "2px solid #e5e7eb" : "none",
        borderRight: tab === key ? "2px solid #e5e7eb" : "none",
        background: tab === key ? "#f0fdf4" : "#f9fafb",
        color: tab === key ? "#16a34a" : "#6b7280",
        fontWeight: tab === key ? 700 : 600,
        fontSize: 16,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  // --- 権限なし画面 ---
  if (!authorized) {
    return (
      <div style={{ ...S.page, display: "flex", flexDirection: "column" }}>
        <h1 style={S.h1}>家計簿（スマホ）</h1>
        <div style={S.card}>
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#dc2626" }}>
              権限がありません
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#4b5563", marginBottom: 8 }}>
              この画面はQRセットアップを完了した端末のみ利用できます。
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6b7280", marginBottom: 16 }}>
              PCで /sync/page を開いてQRコードから設定してください。
            </p>
          </div>

          <ApiUrlBox
            itemsCount={items.length}
            online={online}
            syncing={syncing}
            onSync={sync}
            onConfiguredChange={handleConfiguredChange}
            isOpen={settingsOpen}
          />
        </div>

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={{
              ...S.btn,
              width: "100%",
              fontSize: 13,
              background: settingsOpen ? "#f3f4f6" : "#ffffff",
            }}
          >
            {settingsOpen ? "設定を閉じる" : "設定"}
          </button>

          {settingsOpen && configured && (
            <button
              onClick={handleReset}
              style={{
                ...S.btn,
                width: "100%",
                marginTop: 12,
                fontSize: 13,
                background: "#fee2e2",
                color: "#dc2626",
                border: "1px solid #fca5a5",
              }}
            >
              ⚠️ 設定をリセット
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- 本画面 ---
  return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column" }}>
      <h1 style={S.h1}>家計簿（スマホ）</h1>

      <div style={S.card}>
        <ApiUrlBox
          itemsCount={items.length}
          online={online}
          syncing={syncing}
          onSync={sync}
          onConfiguredChange={handleConfiguredChange}
          isOpen={settingsOpen}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            background: "#ffffff",
            borderRadius: "14px 14px 0 0",
            padding: "4px 4px 0",
            borderTop: "2px solid #e5e7eb",
            borderLeft: "2px solid #e5e7eb",
            borderRight: "2px solid #e5e7eb",
          }}
        >
          {tabBtn("input", "入力")}
          {tabBtn("summary", "集計")}
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: "0 0 16px 16px",
          border: "2px solid #e5e7eb",
          borderTop: "none",
          padding: "16px",
          minHeight: "400px",
        }}
      >
        {tab === "summary" ? (
          <SummaryPage />
        ) : (
          <>
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

            <hr style={{ margin: "20px 0", borderTop: "1px solid #e5e7eb" }} />

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>未送信</h2>
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

      <div style={{ marginTop: "auto", paddingTop: 16, paddingBottom: 16 }}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          style={{
            ...S.btn,
            width: "100%",
            fontSize: 13,
            background: settingsOpen ? "#f3f4f6" : "#ffffff",
          }}
        >
          {settingsOpen ? "設定を閉じる" : "設定"}
        </button>

        {settingsOpen && configured && (
          <button
            onClick={handleReset}
            style={{
              ...S.btn,
              width: "100%",
              marginTop: 12,
              fontSize: 13,
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
            }}
          >
            ⚠️ 設定をリセット
          </button>
        )}
      </div>
    </div>
  );
}
