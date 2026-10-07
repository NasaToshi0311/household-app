# CLAUDE.md

家計簿アプリ（個人利用）。スマホで入力 → PCのAPIへ同期 → PostgreSQLに保存。

## 構成

```
スマホ（PWA: https://household-app.vercel.app）
   │ https
   ▼
Tailscale Funnel（https://pc2023.tail5d0b68.ts.net）
   │
   ▼
PCの Docker: household-api (FastAPI :8000) + household-db (PostgreSQL)
```

- `client/`: React + Vite + TypeScript の PWA。`master` に push すると Vercel が自動デプロイし、スマホは次回起動時に自動更新される。
- `server/`: FastAPI。`docker compose up -d`（`server/` で実行）。ソースはボリュームマウント + `uvicorn --reload` なので、保存すると即反映される。
- 同期先を https にしているのは、iPhone（Safari / WebKit）が https のページから http の通信をブロックするため（mixed content）。

## Tailscale Funnel

- PCに Tailscale を入れ、`tailscale funnel --bg 8000` で `https://pc2023.tail5d0b68.ts.net` → `http://127.0.0.1:8000` を公開している。
- 状態確認: `tailscale funnel status` / 停止: `tailscale funnel --https=443 off`
- 公開URLは証明書の公開ログに載るため秘密ではない。データの保護はAPIキーで行う。

## セキュリティ上の決まり（変更するときは注意）

- **APIキーは `server/.env` の `API_KEY` で管理する。Gitに入れない。** リポジトリは公開されている。`docker-compose.yml` は `.env` が無いと起動しない設定にしてある。
  - 旧デフォルトキー `household-app-secret-key-2024` の記載は README・docs から削除済み（2026-10）。今後も残留させないこと。
  - キーを変えたら、スマホ側は `/sync/page` のQRを読み直す必要がある。
- `server/.env` の `PUBLIC_BASE_URL` がQRコードに入る同期先URL（未設定なら `http://HOST_IP:8000`）。
- **APIキーを発行するページ（`/sync/page`, `/sync/qr.png`, `/sync/url`）と `/docs`, `/openapi.json` は外部から開けない。** `app/middleware/lan_only.py` で、プロキシ経由（X-Forwarded-For 等のヘッダーや `*.ts.net` のHost）のリクエストを拒否している。X-Forwarded-For は偽装できるので、IPの許可判定には使わないこと。
- QRコードのURLは `https://household-app.vercel.app/#base_url=...&api_key=...`。`#`（フラグメント）に入れているのは、APIキーをVercelのアクセスログに残さないため。クライアントは旧形式の `?base_url=...` にも対応している。
- `main.py` の CORS ミドルウェアは最後に追加する（一番外側）。認証エラー(401)にもCORSヘッダーを付けて、ブラウザで「接続エラー」ではなく「認証エラー」と表示させるため。

## 同期の仕組み

- クライアントは IndexedDB に全期間のデータを持つ（以前は直近2か月だけだった）。
- 同期（`client/src/sync.ts`）: 未送信データを `POST /sync/expenses` → `GET /sync/changes?since=...` で差分を取得。
  - 初回・全件再取得時は `since` なし。論理削除済みデータも `deleted: true` で返るので、他端末での削除も反映される。
  - カーソル（`sync_cursor`）は取得上限時刻の5分前に設定し、取りこぼしを防ぐ。重複は内容比較で無視。
- 削除: サーバーに保存済みのデータは論理削除（`op: "delete"` を同期）、未送信のデータはその場で物理削除。

## Notion 連携

- 月ごとのカテゴリ別合計・件数を Notion の data source に送る（`app/services/notion.py`, Notion-Version `2026-03-11`）。明細やメモは送らない。
- `server/.env` の `NOTION_TOKEN` / `NOTION_DATA_SOURCE_ID` を使う。トークンはログやエラーメッセージに出さないこと。
- 手動: `POST /notion/sync?month=YYYY-MM`（省略で先月, APIキー必須）。同じ月・カテゴリの行は更新し、支出が無くなったカテゴリは0にする。
- 自動: compose の `notion-scheduler` サービスが毎月1日 6:00 JST に先月分を送る。PCが止まっていて逃した場合は、起動時に対象月の行が Notion に無ければ送る。

## 動作確認

- `client/` で `npm run dev` → `http://localhost:5173`。localStorage に `household_api_base_url` / `household_api_key` / `setup_via_qr=1` を入れると、ローカルAPIにつながる。
- **テストで入力したデータを同期しないこと**（本番の家計簿データに入ってしまう）。確認後はブラウザの localStorage と IndexedDB を消す。
- `npx tsc -b` と `npx vite build` が通ることを確認する。ESLint の `no-explicit-any` は既存コードにも多数ある。
