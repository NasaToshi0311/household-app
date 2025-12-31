import { useEffect, useState } from "react";
import { addPending, getAllPending, removePending, removeOnePending } from "./db";
import type { PendingExpense } from "./db";
import { useOnline } from "./hooks/useOnline";
import SummaryPage from "./pages/SummaryPage";
import { syncExpenses } from "./api/expenses";
import ApiUrlBox from "./components/ApiUrlBox";
import PendingList from "./components/PendingList";
import ExpenseForm from "./components/ExpenseForm";
import * as S from "./ui/styles.ts";


export default function App() {
  const [items, setItems] = useState<PendingExpense[]>([]);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>("");

  const [tab, setTab] = useState<"input" | "summary">("input");
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setItems(await getAllPending());
  }

  async function sync() {
    if (syncing) return;
    setSyncing(true);

    try {
      const latest = await getAllPending();
      if (latest.length === 0) {
        alert("未送信がありません");
      } else {
        const result = await syncExpenses(latest);
        await removePending(result.ok_uuids);
        await refresh();
        alert(`同期完了（成功 ${result.ok_uuids.length} / 失敗 ${result.ng_uuids.length}）`);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        alert("同期失敗: タイムアウト");
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
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #ddd",
        background: tab === key ? "#eaeaea" : "#fafafa",
        fontWeight: tab === key ? 700 : 500,
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

      <div style={{ ...S.row, marginTop: 12 }}>
        {tabBtn("input", "入力")}
        {tabBtn("summary", "集計")}
      </div>

      <div style={{ marginTop: 12 }}>
        {tab === "summary" ? (
          <SummaryPage baseUrl={apiBaseUrl} />
        ) : (
          <>
            <div style={S.card}>
              <ExpenseForm
                onAdd={async (item) => {
                  await addPending({ ...item, op: "upsert" });
                  await refresh();
                }}
              />
            </div>

            <hr style={{ margin: "16px 0" }} />
            <div style={S.card}>
              <h2>未送信</h2>
              <PendingList
                items={items}
                onDeleteOne={async (id) => {
                  if (!confirm("この未送信データを削除しますか？")) return;
                  await removeOnePending(id);
                  await refresh();
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
