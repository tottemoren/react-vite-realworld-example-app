// classnames: 条件に応じて CSS クラス名を組み立てるためのライブラリ
// 例: classNames('nav-link', { active: true }) → 'nav-link active'
import classNames from 'classnames'
import React from 'react'
// ArticleList: 記事の一覧を表示する部品 / PopularTags: 人気タグの一覧を表示する部品
import { ArticleList, PopularTags } from '../components'
// useAuth: 「今ログインしているかどうか」などの認証情報を取り出すためのフック
import { useAuth } from '../hooks'

// 記事一覧の「絞り込み条件(フィルター)」の初期値
// - tag:    このタグが付いた記事だけを表示する(空文字なら絞り込まない)
// - offset: 何ページ目から表示するか(null なら指定なし)
// - feed:   true ならフォローしているユーザーの記事だけ(Your Feed)を表示する
const initialFilters = { tag: '', offset: null, feed: false }

// トップページ(ホーム画面)のコンポーネント
function Home() {
  // isAuth: ログインしていれば true、していなければ false
  const { isAuth } = useAuth()

  // filters: 現在の絞り込み条件を保存する「状態(state)」
  // setFilters: filters を書き換えるための関数(呼ぶと画面が再描画される)
  // 初期表示では、ログイン中なら Your Feed、未ログインなら Global Feed を表示する
  // ※ { ...initialFilters, feed: isAuth } は「initialFilters をコピーして feed だけ上書き」という意味
  const [filters, setFilters] = React.useState({ ...initialFilters, feed: isAuth })

  // useEffect: 第2引数の配列 [isAuth] の値が変わったときに中の処理を実行する
  // ログイン・ログアウトしたときに、表示するフィードを切り替え直すための処理
  React.useEffect(() => {
    setFilters({ ...initialFilters, feed: isAuth })
  }, [isAuth])

  // 右側の人気タグがクリックされたとき:そのタグの記事だけを表示する
  function onTagClick(tag) {
    setFilters({ ...initialFilters, tag })
  }

  // 「Global Feed」タブがクリックされたとき:絞り込みなしで全員の記事を表示する
  function onGlobalFeedClick() {
    setFilters(initialFilters)
  }

  // 「Your Feed」タブがクリックされたとき:フォロー中のユーザーの記事だけを表示する
  function onFeedClick() {
    setFilters({ ...initialFilters, feed: true })
  }

  // ここから下が実際に画面に表示される内容(JSX)
  return (
    <div className="home-page">
      {/* 上部のバナー(サイト名とキャッチコピー) */}
      <div className="banner">
        <div className="container">
          <h1 className="logo-font">conduit</h1>
          <p>A place to share your knowledge.</p>
        </div>
      </div>
      <div className="container page">
        <div className="row">
          {/* 左側(メイン部分):フィード切り替えタブと記事一覧 */}
          <div className="col-md-9">
            <div className="feed-toggle">
              <ul className="nav nav-pills outline-active">
                {/* 「条件 && 要素」は、条件が true のときだけ要素を表示する書き方 */}
                {/* Your Feed タブはログインしているときだけ表示する */}
                {isAuth && (
                  <li className="nav-item">
                    <button
                      onClick={onFeedClick}
                      type="button"
                      // feed が true のとき 'active' クラスを付けて、選択中のタブとして強調表示する
                      className={classNames('nav-link', {
                        active: filters.feed,
                      })}
                    >
                      Your Feed
                    </button>
                  </li>
                )}
                {/* Global Feed タブは常に表示する */}
                <li className="nav-item">
                  <button
                    type="button"
                    // タグでも Your Feed でも絞り込んでいないときに選択中として表示する
                    // ※ filters?.tag の「?.」は filters が空(null/undefined)でもエラーにしない書き方
                    className={classNames('nav-link', {
                      active: !filters?.tag && !filters.feed,
                    })}
                    onClick={onGlobalFeedClick}
                  >
                    Global Feed
                  </button>
                </li>
                {/* タグで絞り込んでいるときだけ「# タグ名」のタブを表示する */}
                {filters?.tag && (
                  <li className="nav-item">
                    <a className="nav-link active"># {filters?.tag}</a>
                  </li>
                )}
              </ul>
            </div>
            {/* 現在の絞り込み条件(filters)を渡して、条件に合う記事一覧を表示する */}
            <ArticleList filters={filters} />
          </div>
          {/* 右側(サイドバー):人気タグ一覧。タグがクリックされると onTagClick が呼ばれる */}
          <div className="col-md-3">
            <PopularTags onTagClick={onTagClick} />
          </div>
        </div>
      </div>
    </div>
  )
}

// 他のファイルから import Home from './pages/Home' のように使えるようにする
export default Home
