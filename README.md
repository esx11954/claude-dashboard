# claude-dashboard

Claude Code のセッション履歴・メモリをブラウザで閲覧するローカルWebダッシュボード。
`~/.claude/projects/` 以下のデータを読み取り、プロジェクトごとのセッション一覧と要約メモリを表示します。

## できること

- プロジェクト一覧の表示（セッション数・最終更新日）
- セッション一覧の表示（タイトル・ターン数・日時）
- セッションメモリ（`memory/*.md`）の閲覧
- `MEMORY.md` インデックスからの要約一覧

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

## 構成

```
src/
├── server.js        # エントリーポイント（port: 3005）
├── router.js        # ルーティング
├── data/
│   └── projects.js  # projects/ 読み取りロジック
└── views/
    ├── layout.js    # 共通HTMLラッパー
    ├── home.js      # トップページ（プロジェクト一覧）
    ├── project.js   # プロジェクト詳細・セッション一覧
    └── session.js   # セッションメモリ詳細
public/
└── style.css
```

## 動作要件

- Node.js 18+
- `~/.claude/projects/` が存在すること（Claude Code が自動生成）
