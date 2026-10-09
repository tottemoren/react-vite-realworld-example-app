# Conduit（React）コードリーディング & バグ修正

> [RealWorld](https://github.com/gothinkster/realworld)（Medium 風のブログサービス「Conduit」）の React 実装をフォークし、Java（Spring Boot）のバックエンドと組み合わせて動かしたうえで、コードを読み、バグを調査して修正した学習用リポジトリです。

- フロントエンド（このリポジトリ）: React 17 / Vite / react-query
- バックエンド: [tottemoren/realworld-java21-springboot3](https://github.com/tottemoren/realworld-java21-springboot3)（Java 21 / Spring Boot 3）
- フォーク元: [romansndlr/react-vite-realworld-example-app](https://github.com/romansndlr/react-vite-realworld-example-app)

## このフォークでやったこと

| コミット | 内容 | 担当 |
|---|---|---|
| [`692b8fb`](https://github.com/tottemoren/react-vite-realworld-example-app/commit/692b8fb97ad89a50861dfc22c9b3112d2b5064d4) | ローカルの Spring Boot バックエンドに接続して動かすための準備 | AI（Claude）と共同 |
| [`7dfdd9e`](https://github.com/tottemoren/react-vite-realworld-example-app/commit/7dfdd9e2bb507b746c70806ea778e92358f24bda) | コードリーディング用の日本語コメントを追加 | AI（Claude Code）で生成し、読みながら確認 |
| [`90372e5`](https://github.com/tottemoren/react-vite-realworld-example-app/commit/90372e599134b5be49bf7efb94b10fc7117f0f79) | **トークン期限切れ時に画面が真っ白になるバグの調査・修正** | **自分** |
| [PR #2](https://github.com/tottemoren/react-vite-realworld-example-app/pull/2)（[Issue #1](https://github.com/tottemoren/react-vite-realworld-example-app/issues/1)） | **401 が返ったらログアウトしてログイン画面に移動する** | **自分**（影響範囲の洗い出しとコメントの整理は AI と共同） |

## バグ調査：ページを開いて約 10 秒後に画面が真っ白になる

### 症状

ログインした状態でしばらく時間をおいてからトップページを開くと、「Loading articles...」と表示されたあと、約 10 秒後に画面全体が真っ白になる。

### 調査の流れ

1. **Console で原因の行を特定**
   開発者ツールの Console に、次のエラーが出ていた。
   ```
   Uncaught TypeError: Cannot read properties of undefined (reading 'articlesCount')
       at ArticleList (ArticleList.jsx:64:32)
   ```
   `ArticleList.jsx` で、中身が空（`undefined`）の `data` から `articlesCount` を読もうとしてクラッシュしていた。

2. **なぜ data が空なのかを確認**
   エラーより前に、`/api/articles/feed` と `/api/tags` への **401（認証エラー）が繰り返し**出ていた。
   react-query は失敗すると自動で 3 回再試行し（1 秒 → 2 秒 → 4 秒）、すべて失敗するとエラーが確定して `data` が `undefined` になる。これが「約 10 秒後」の正体だった。

3. **Network でなぜ 401 なのかを確認**
   レスポンスヘッダーに次のように書かれていた。
   ```
   WWW-Authenticate: Bearer error="invalid_token", error_description="... Jwt expired at ..."
   ```
   ログイン時に受け取った JWT の有効期限が切れていた。

4. **期限の設定を確認**
   バックエンドの `AuthTokenProvider.java` で、JWT の有効期限が `now.plusSeconds(300)`（**5 分**）に設定されていた。
   JWT はブラウザの `localStorage` に保存されるため、ブラウザを閉じても期限切れのトークンを送り続けていた。

### 原因：3 つの問題の連鎖

```
① バックエンド：JWT の有効期限が 5 分と短い
      ↓
② フロント：401 が返ってきても、ログイン画面に戻す仕組みがない
      ↓  3 回再試行（約 10 秒）してエラーが確定
③ フロント：エラーチェックより前で data を読んでいたため、クラッシュ
      ↓
アプリ全体が真っ白になる
```

### 修正内容（③）

`ArticleList.jsx` では、エラー時の表示（`if (isError) return ...`）は用意されていたが、その**手前**でページ数の計算（`data.articlesCount`）をしていたため、安全装置にたどり着く前にクラッシュしていた。

ページ数の計算を、「読み込み中」「エラー」のチェックより**後ろ**に移動した。これにより、エラー時は「Loading articles failed :(」が表示され、画面が真っ白にならなくなった。

**検討した他の修正方法と、採用しなかった理由**

| 方法 | 採用しなかった理由 |
|---|---|
| `data?.articlesCount` にする | クラッシュは止まるが、計算結果が `NaN` になり、おかしな値が静かに残る |
| `data` に初期値を入れる | 本当はエラーなのに「記事が 0 件」に見えてしまう |
| Error Boundary で全体を包む | 真っ白は防げるが、このバグ自体は直らない（今後の保険として別途検討） |

### 動作確認

- 期限切れのトークンでページを開く → 真っ白にならず「Loading articles failed :(」が表示される
- ログインしていない状態 → 通常どおり表示される

### 修正内容（②）：401 が返ったらログイン画面に移動する

③の修正で画面は真っ白にならなくなったが、ユーザーには「failed」と表示されるだけで、ログインし直せばよいことが分からなかった。
そこで、axios の interceptor で 401 を 1 か所で受け取り、ログアウトしてログイン画面に移動するようにした。
Issue で症状・再現手順・影響範囲を整理してから、ブランチを切って修正し、Pull Request でマージした。

- 修正前に影響範囲を調べ、次の落とし穴に対策した
  - ログイン失敗を 401 で返すバックエンドでも壊れないよう、ログインの通信は対象外にする
  - 別のユーザーでログインし直したときに前のユーザーのデータが残らないよう、キャッシュを消す
  - 複数の通信が同時に 401 になっても問題が起きないようにする
- 期限切れのトークンでページを開くと、約 10 秒後の「failed」表示ではなく、**3 秒以内にログイン画面へ移動する**ようになった

詳細：[Issue #1](https://github.com/tottemoren/react-vite-realworld-example-app/issues/1) / [PR #2](https://github.com/tottemoren/react-vite-realworld-example-app/pull/2)

## まだ残っている課題

- [x] ② 401 が返ってきたら、ログアウトしてログイン画面に戻す（PR #2）
- [x] 401 のときに 10 秒待たされないようにする（PR #2 で、最初の 401 でログイン画面に移動するようになり解消）
- [ ] ① JWT の有効期限（5 分）の見直し（バックエンド）
- [ ] Error Boundary の追加
- [ ] パスワードを間違えてもエラーメッセージが表示されない（`Auth.jsx` が 422 しか処理せず、このバックエンドは 400 を返すため。PR #2 の動作確認中に発見）
- [ ] ページ送りが API 仕様と異なる（フロントは offset にページ番号を送り、バックエンドは offset をページ番号として扱っているため、組み合わせでは偶然動いている）
- [ ] 記事本文の Markdown が表示に反映されない
- [ ] 依存ライブラリに既知の脆弱性が 50 件ある（`npm audit`。axios 0.21.1 など。更新すると書き方が大きく変わる可能性があるため、別途対応）

## 学んだこと

　ブラウザからコンソールを見たりネットワークを確認して自分で調査をした。
　画面が表示されていたのに10秒後に突然消えることから、エラーチェックのコードが間違っていると推測を立てたがが、実際には認証切れ時の処理やコードの順番がおかしいなどの複数の要因から成立していたバグだった。
　ある程度バグの修正にも経験やありがちな法則を理解することが有用だと思った。

## AI の使い方について

- 環境構築（ローカルでフロントとバックをつなぐ設定）は、AI（Claude）と一緒に行いました。
- コードを読むための日本語コメントは、AI（Claude Code）に生成してもらい、それを読みながら理解を進めました。
- バグの調査は、AI に手順のガイドを受けながら、Console や Network の確認と原因の特定を自分で行いました。
- 修正方法は AI と複数の案を比較して決め、コードの変更と動作確認は自分で行いました。
- ②の修正では、AI と影響範囲を洗い出し、AI がコードに書いた説明コメントを読んで理解してから、自分でコードを書きました。最後のコメントの整理（理由だけを残す）は AI が行いました。

## ローカルで動かす方法

1. バックエンドを起動する（[バックエンドの README](https://github.com/tottemoren/realworld-java21-springboot3) を参照）
   ```bash
   ./gradlew realworld:bootRun --args='--server.port=8081'
   ```
2. このリポジトリで、接続先の設定ファイルを作る
   ```bash
   cp .env.example .env.local
   ```
3. フロントエンドを起動する
   ```bash
   npm install
   npx vite --host 127.0.0.1 --port 5174 --strictPort
   ```
4. ブラウザで http://127.0.0.1:5174/ を開く

---

以下は、フォーク元のリポジトリの README です。

---

# React + Vite Example App
[![Netlify Status](https://api.netlify.com/api/v1/badges/4f108734-4ada-4033-9a04-a50ba696b360/deploy-status)](https://app.netlify.com/sites/react-vite-realworld/deploys)

> ### React + Vite codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld-example-apps) spec and API.

[RealWorld](https://github.com/gothinkster/realworld)&nbsp;&nbsp;&nbsp;&nbsp;[Demo](https://react-vite-realworld.netlify.app/)

## Getting started

To get the frontend running locally:

- Clone this repo
- `npm install` to install all req'd dependencies
- `npm run dev` to start the local server (this project Vite)

### Making requests to the backend API

For convenience, we have a live API server running at https://conduit.productionready.io/api for the application to make requests against. You can view [the API spec here](https://github.com/GoThinkster/productionready/blob/master/api) which contains all routes & responses for the server.

The source code for the backend server (available for Node, Rails and Django) can be found in the [main RealWorld repo](https://github.com/gothinkster/realworld).

## Functionality overview

The example application is a social blogging site (i.e. a Medium.com clone) called "Conduit". It uses a custom API for all requests, including authentication.

**General functionality:**

- Authenticate users via JWT (login/signup pages + logout button on settings page)
- CRU* users (sign up & settings page - no deleting required)
- CRUD Articles
- CR*D Comments on articles (no updating required)
- GET and display paginated lists of articles
- Favorite articles
- Follow other users

**The general page breakdown looks like this:**

- Home page (URL: /#/ )
    - List of tags
    - List of articles pulled from either Feed, Global, or by Tag
    - Pagination for list of articles
- Sign in/Sign up pages (URL: /#/login, /#/register )
    - Use JWT (store the token in localStorage)
- Settings page (URL: /#/settings )
- Editor page to create/edit articles (URL: /#/editor, /#/editor/article-slug-here )
- Article page (URL: /#/article/article-slug-here )
    - Delete article button (only shown to article's author)
    - Render markdown from server client side
    - Comments section at bottom of page
    - Delete comment button (only shown to comment's author)
- Profile page (URL: /#/@username, /#/@username/favorites )
    - Show basic user info
    - List of articles populated from author's created articles or author's favorited articles

<br />

[![Brought to you by Thinkster](https://raw.githubusercontent.com/gothinkster/realworld/master/media/end.png)](https://thinkster.io)
