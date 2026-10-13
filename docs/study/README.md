# 学習ノート — Conduit（React）コードリーディング

RealWorld 仕様のブログサービス「Conduit」の React 実装を題材に、実務的なフロントエンドのコードを観点ごとに読み解くノートです。
バックエンドは [tottemoren/realworld-java21-springboot3](https://github.com/tottemoren/realworld-java21-springboot3)（Java / Spring Boot）と組み合わせて動かしています。
バグ調査と修正の記録は、リポジトリ直下の [README](../../readme.md) にあります。

> 各ノートは準備中です。「読むときの問い」に答える形で、**該当コードへのリンク** と **自分の考え** を記録していきます。

## 目次

| # | ノート | 内容 | 状態 |
|---|--------|------|------|
| 0 | [アプリの全体像](00-app-overview.md) | どんなサービスか、データ・画面・API の全体像 | 未着手 |
| 1 | [設計](01-architecture.md) | 構成の分け方、1つの機能を縦に追う | 未着手 |
| 2 | [テスト](02-testing.md) | テストの構成と書き方 | 未着手 |
| 3 | [セキュリティ](03-security.md) | 認証（JWT）、認可、入力検証、CORS | 未着手 |
| 4 | [命名・コメント](04-naming-and-comments.md) | 名前とコメントの付け方 | 未着手 |
| 5 | [リファクタリング](05-refactoring.md) | git 履歴から設計の変遷を追う | 未着手 |
| 6 | [フロントとバックエンドの連携](06-frontend-backend-integration.md) | API 仕様、ローカルでの接続、エラーの受け渡し | 未着手 |

## 読み進め方
1. `src/App.jsx` のルーティングから、画面の全体像を把握する
2. 1つの操作を「ボタン（component）→ フック（hooks）→ API → state の更新 → 再描画」と縦に追う
3. `git log` / `git blame` で設計の変遷を確認する
4. 学んだことを自分の言葉でノートにまとめる
