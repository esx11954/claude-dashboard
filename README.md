# claude-dashboard

Claude Code のセッション履歴・メモリをブラウザで閲覧するローカルWebダッシュボード。
`~/.claude/projects/` 以下のデータを読み取り、プロジェクトごとのセッション一覧と要約メモリを表示します。

## できること

- プロジェクト一覧の表示（セッション数・最終更新日）
- セッション一覧の表示（タイトル・ターン数・日時）
- セッションメモリ（`memory/*.md`）の閲覧・編集
- `MEMORY.md` インデックスからの要約一覧
- セッション履歴のJSONキャッシュへの同期（30日削除対策）
- プロジェクトページからワンクリックでClaudeセッション起動

## 配置場所

[claude-config](https://github.com/esx11954/claude-config) の submodule として `~/.claude/dashboard/` に配置します。

```bash
# claude-config ごとクローンする場合
git clone https://github.com/esx11954/claude-config.git ~/.claude
cd ~/.claude
git submodule update --init

# このリポジトリ単体でセットアップする場合
git clone https://github.com/esx11954/claude-dashboard.git ~/.claude/dashboard
```

## セットアップ

```bash
cd ~/.claude/dashboard
npm install
```

Windowsの場合は `install.bat` をダブルクリックでも可。

**PM2で常駐起動（推奨）**

```bash
pm2 start src/server.js --name claude-dashboard
pm2 save  # OS再起動後も自動起動させる場合
# → http://localhost:3005
```

Windowsの場合は `start.bat` をダブルクリックでも可。

**一時起動**

```bash
npm start
# → http://localhost:3005
```

## データソース

`~/.claude/projects/<project-dir>/` 以下のファイルを読み取ります。

| ファイル | 内容 |
|----------|------|
| `*.jsonl` | セッション履歴（タイトル・ターン数・CWD を抽出） |
| `memory/MEMORY.md` | メモリインデックス（セッション要約の一覧） |
| `memory/session-*.md` | セッションごとの要約詳細 |

メモリファイルは [session-end hook](https://github.com/esx11954/claude-config/blob/main/hooks/session-end.js) によって自動生成されます。

### 同期機能（JSONキャッシュ）

Claude Code の仕様により、`*.jsonl` ファイルは**30日後に自動削除**されます。これを補うため、ダッシュボード内にJSONキャッシュを保持する同期機能を備えています。

- プロジェクト詳細画面の「同期」ボタンを押すと、未変換のJSONLをJSONに変換して `dashboard/projects/<project-dir>/` に保存
- 変換済みJSONLはmtimeを比較して差分がある場合のみ再変換（進行中セッションの更新に対応）
- JSONLが削除された後もJSONが残っていれば履歴として閲覧可能（アーカイブ済として表示）
- `dashboard/projects/` はGit管理外（`.gitignore`）のためローカルにのみ蓄積される

## 構成

```
src/
├── server.js        # エントリーポイント（port: 3005）
├── router.js        # ルーティング
├── data/
│   ├── projects.js  # projects/ 読み取りロジック（JSONキャッシュ優先参照）
│   └── sync.js      # JSONLからJSONへの変換・同期ロジック
└── views/
    ├── layout.js    # 共通HTMLラッパー
    ├── home.js      # トップページ（プロジェクト一覧）
    ├── project.js   # プロジェクト詳細・セッション一覧
    └── session.js   # セッション詳細（会話表示）
public/
└── style.css
projects/            # JSONキャッシュ保存先（.gitignore・自動生成）
```

## 動作要件

- Node.js 18+
- `~/.claude/projects/` が存在すること（Claude Code が自動生成）
