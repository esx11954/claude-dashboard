# Claude Dashboard

`~/.claude/projects` の内容をブラウザで確認するためのローカルWebダッシュボード。

## 起動

```bash
# PM2で常駐起動（推奨）
pm2 start src/server.js --name claude-dashboard
# http://localhost:3005

# 一時起動
npm start
```

## 構成

```
src/
├── server.js       # エントリーポイント
├── router.js       # ルーティング
├── data/
│   └── projects.js # .claude/projects 読み取りロジック
└── views/
    ├── layout.js   # 共通HTMLラッパー
    ├── home.js     # トップページ（プロジェクト一覧）
    └── project.js  # プロジェクト詳細
public/
└── style.css
```

## データソース

`C:\Users\<user>\.claude\projects\<project-dir>/`
- `*.jsonl` — セッション履歴（CWD・タイトル・ターン数を読み取り）
- `memory/MEMORY.md` — メモリインデックス
- `memory/*.md` — メモリ詳細ファイル
