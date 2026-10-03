import { useEffect, useState, useCallback, useRef } from "react";
import { upsertExpense, getPendingExpenses, deleteExpense } from "./db";
import type { Expense, ExpenseInput } from "./db";
import { useOnline } from "./hooks/useOnline";
import { getApiBaseUrl, getApiKey, isSetupViaQr, clearSetup } from "./config/api";
import SummaryPage from "./pages/SummaryPage";
import { runSync, resetSyncCursor, getLastSyncedAt, type SyncResult } from "./sync";
import ApiUrlBox from "./components/ApiUrlBox";
import PendingList from "./components/PendingList";
import ExpenseForm from "./components/ExpenseForm";
import ConfirmDialog from "./components/ConfirmDialog";
import Modal from "./components/Modal";
import Notice, { type NoticeData } from "./components/Notice";
import * as S from "./ui/styles.ts";

type ConfirmState = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

function syncResultMessage(r: SyncResult): string {
  const parts: string[] = [];
  if (r.sent > 0) parts.push(`送信 ${r.sent}件`);
  if (r.received > 0) parts.push(`受信 ${r.received}件`);
  if (r.removed > 0) parts.push(`削除反映 ${r.removed}件`);
  const detail = parts.length > 0 ? `（${parts.join("・")}）` : "（変更なし）";
  return `${r.fullFetch ? "全データを取得しました" : "同期しました"}${detail}`;
}

function syncErrorMessage(e: any): string {
  const isTimeout = e?.name === "AbortError" || e?.message?.includes("timeout");
  const isNetwork = e?.name === "NetworkError";
  if (!isTimeout && !isNetwork) {
    return `同期に失敗しました\n${e?.message ?? "不明なエラー"}`;
  }
  return (
    `同期に失敗しました（${isTimeout ? "タイムアウト" : "サーバーに接続できません"}）\n` +
    `・PCのサーバーが起動しているか\n` +
    `・PCとスマホが同じWi-Fiにつながっているか\n` +
    `・同期先: ${getApiBaseUrl() || "未設定"}`
  );
}

export default function App() {
  const [items, setItems] = useState<Expense[]>([]);
  const [, forceRender] = useState(0); // storage更新後の再レンダリング用

  const [tab, setTab] = useState<"input" | "summary">("input");
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [notice, setNotice] = useState<NoticeData | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  // storageから毎回計算（stateで持たない）
  const apiBaseUrl = getApiBaseUrl().trim();
  const apiKey = getApiKey().trim();
  const configured = !!apiBaseUrl && !!apiKey;
  const setupViaQr = isSetupViaQr();
  const authorized = configured && setupViaQr;

  const showNotice = useCallback((type: NoticeData["type"], text: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice({ id: Date.now(), type, text });
    // 成功は自動で消す。エラーは読めるように残す
    if (type === "success") {
      noticeTimer.current = window.setTimeout(() => setNotice(null), 3000);
    }
  }, []);

  /** ローカルデータが変わったときに呼ぶ（未送信一覧と集計を更新） */
  const refresh = useCallback(async () => {
    setItems(await getPendingExpenses());
    setLastSyncedAt(await getLastSyncedAt());
    setDataVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ApiUrlBoxで設定が変わったら再レンダリング
  const handleConfiguredChange = useCallback(() => {
    forceRender((v) => v + 1);
  }, []);

  function handleReset() {
    setConfirmDialog({
      message: "同期の設定をリセットしますか？\nもう一度QRコードを読み取るまで同期できなくなります。",
      confirmLabel: "リセット",
      onConfirm: () => {
        clearSetup();
        setConfirmDialog(null);
        handleConfiguredChange();
      },
    });
  }

  async function sync(options: { full?: boolean } = {}) {
    if (syncing) return;
    setSyncing(true);

    try {
      if (options.full) await resetSyncCursor();
      const result = await runSync();
      if (result.failed > 0) {
        showNotice("error", `${result.failed}件の送信に失敗しました。もう一度同期してください。\n${syncResultMessage(result)}`);
      } else {
        showNotice("success", syncResultMessage(result));
      }
    } catch (e: any) {
      showNotice("error", syncErrorMessage(e));
    } finally {
      await refresh();
      setSyncing(false);
    }
  }

  async function handleSave(input: ExpenseInput, isEdit: boolean) {
    await upsertExpense(input);
    await refresh();
    showNotice("success", `${input.category} ¥${input.amount.toLocaleString("ja-JP")} を${isEdit ? "更新" : "追加"}しました`);
  }

  function handleDelete(expense: Expense) {
    setConfirmDialog({
      message: `${expense.category} ¥${expense.amount.toLocaleString("ja-JP")} を削除しますか？` +
        (expense.status === "synced" || expense.on_server ? "\n\n次回の同期でサーバーからも削除されます。" : ""),
      onConfirm: async () => {
        setConfirmDialog(null);
        await deleteExpense(expense.client_uuid);
        await refresh();
        showNotice("success", "削除しました");
      },
    });
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
        WebkitTapHighlightColor: "rgba(0, 0, 0, 0.1)",
        touchAction: "manipulation",
        WebkitUserSelect: "none",
        userSelect: "none",
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );

  const settingsButtons = (
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

      {settingsOpen && authorized && (
        <button
          onClick={() => sync({ full: true })}
          disabled={!online || syncing}
          style={{ ...S.btn, width: "100%", marginTop: 12, fontSize: 13, opacity: !online || syncing ? 0.6 : 1 }}
        >
          🔄 サーバーから全データを取り直す
        </button>
      )}

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
  );

  const dialogs = (
    <>
      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <ExpenseForm
            key={editing.client_uuid}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              await handleSave(input, true);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {notice && <Notice key={notice.id} notice={notice} onClose={() => setNotice(null)} />}
    </>
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
            {settingsOpen && (
              <div style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 16,
                padding: 12,
                background: "#f3f4f6",
                borderRadius: 8,
                textAlign: "left"
              }}>
                <strong>設定状況:</strong>
                <div style={{ marginTop: 8 }}>
                  <div>API URL設定: {configured ? "✓" : "✗"}</div>
                  <div>QRセットアップ: {setupViaQr ? "✓" : "✗"}</div>
                  <div>API URL: {apiBaseUrl || "(未設定)"}</div>
                  <div>API Key: {apiKey ? "設定済み" : "(未設定)"}</div>
                </div>
              </div>
            )}
          </div>

          <ApiUrlBox
            itemsCount={items.length}
            online={online}
            syncing={syncing}
            lastSyncedAt={lastSyncedAt}
            onSync={() => sync()}
            onConfiguredChange={handleConfiguredChange}
            isOpen={settingsOpen}
          />
        </div>

        {settingsButtons}
        {dialogs}
      </div>
    );
  }

  // --- 本画面 ---
  return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column" }}>
      <h1 style={S.h1}>家計簿（スマホ）</h1>

      <div style={{ ...S.card, padding: "12px 16px" }}>
        <ApiUrlBox
          itemsCount={items.length}
          online={online}
          syncing={syncing}
          lastSyncedAt={lastSyncedAt}
          onSync={() => sync()}
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
          <SummaryPage
            dataVersion={dataVersion}
            lastSyncedAt={lastSyncedAt}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        ) : (
          <>
            <ExpenseForm onSubmit={(input) => handleSave(input, false)} />

            <hr style={{ margin: "20px 0", borderTop: "1px solid #e5e7eb" }} />

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>未送信</h2>
            <PendingList items={items} onEdit={setEditing} onDelete={handleDelete} />
          </>
        )}
      </div>

      {settingsButtons}
      {dialogs}
    </div>
  );
}
