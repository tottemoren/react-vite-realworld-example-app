// React を使うための読み込み
import React from 'react'
// lodash-es … 便利な関数がたくさん入ったライブラリ
//   isEmpty … 空かどうかを調べる(例: isEmpty([]) → true)
//   isNil   … null か undefined かを調べる(例: isNil(null) → true、isNil(0) → false)
import { isEmpty, isNil } from 'lodash-es'
// useEffect の仲間。違いは下の useDeepCompareEffect の部分で説明
import useDeepCompareEffect from 'use-deep-compare-effect'
// 記事一覧を API から取ってくるためのフック(中身は useQuery。hooks/useArticlesQuery.js を参照)
import { useArticlesQuery } from '../hooks'
// 記事1件分のカード(タイトル・著者・いいねボタンなど)を表示する部品
import ArticlePreview from './ArticlePreview'

// 「記事一覧」を表示するコンポーネント
// 親から受け取った絞り込み条件(filters)に合う記事を取ってきて、10件ずつ表示し、ページ切り替えボタンも出す
// 使われている場所:
//   - pages/Home.jsx    … トップページ(Global Feed / Your Feed / タグで絞り込み)
//   - pages/Profile.jsx … ユーザーページ(その人が書いた記事 / いいねした記事)
// filters の中身を変えるだけで、どちらのページでも使い回せるようになっている

// ↓ この /** ... */ はエディタに「filters にはこういう項目がある」と教えるための説明書き(JSDoc)
//   プログラムの動作には影響しない
/**
 * @typedef {object} Filters
 * @property {string} [Filter.author]
 * @property {string} [Filter.favorited]
 * @property {string} [Filter.tag]
 * @property {number} [Filter.offset]
 * @property {boolean} [Filter.feed]
 */

// 絞り込み条件の初期値(親から filters が渡されなかったときに使う)
//   author    … このユーザーが書いた記事だけ
//   favorited … このユーザーがいいねした記事だけ
//   tag       … このタグが付いた記事だけ
//   offset    … 何ページ目を表示するか(0 が1ページ目)
//   feed      … true ならフォロー中のユーザーの記事だけ
// null は「その条件では絞り込まない」という意味
/** @type {Filters} */
const initialFilters = { author: null, favorited: null, tag: null, offset: null, feed: false }
// 1ページに表示する記事の数
const limit = 10

// { filters = initialFilters } … 親から filters を受け取る。渡されなかったら initialFilters を使う(デフォルト値)
function ArticleList({ filters = initialFilters }) {
  // offset: 今表示しているページ番号を覚えておく state(0 が1ページ目、1 が2ページ目…)
  // setOffset でページ番号を変えると、再レンダリングされて新しいページの記事を取り直す
  const [offset, setOffset] = React.useState(0)

  // 記事一覧を API から取ってくる
  // { ...filters, offset } … 親から受け取った条件をコピーして、今のページ番号 offset を足したもの
  // 受け取るもの:
  //   data       … 取ってきたデータ。{ articles: [記事, 記事, ...], articlesCount: 記事の総数 } の形
  //   isFetching … 通信中なら true
  //   isError    … 通信に失敗したら true
  //   isSuccess  … 通信に成功したら true
  const { data, isFetching, isError, isSuccess } = useArticlesQuery({ filters: { ...filters, offset } })

  // 全部で何ページあるかを計算する
  // Math.ceil … 小数点以下を切り上げる(例: 記事が25件 → 25 / 10 = 2.5 → 3ページ)
  // ※ この行は下の「通信中なら Loading」のチェックより前にあるので、通信中でも実行される
  //    データが届く前でも data が undefined にならないよう、useArticlesQuery.js で
  //    placeholderData(仮のデータ)を設定している。それがないとここでエラーになる
  const pages = Math.ceil(data.articlesCount / limit)

  // 親から「このページを表示して」と指定されたら(filters.offset が null でなければ)、そのページに切り替える
  // useDeepCompareEffect … useEffect とほぼ同じで、[filters] が変わったときに中の処理を実行する
  //   普通の useEffect は、オブジェクトを「中身」ではなく「同じ物かどうか」で比べる
  //   親が再描画されるたびに filters は作り直されるので、中身が同じでも毎回「変わった」と判定されてしまう
  //   useDeepCompareEffect は「中身」で比べるので、本当に条件が変わったときだけ実行される
  useDeepCompareEffect(() => {
    if (!isNil(filters.offset)) {
      setOffset(filters.offset)
    }
  }, [filters])

  // ここから、状態に応じて表示を出し分ける(return した時点でこの関数は終わる)
  // 通信中なら「読み込み中」と表示する
  // (データが届くと再レンダリングされて、もう一度この関数が上から実行される)
  if (isFetching) return <p className="article-preview">Loading articles...</p>
  // 通信に失敗したら「失敗しました」と表示する
  if (isError) return <p className="article-preview">Loading articles failed :(</p>
  // 通信には成功したが記事が0件なら「まだ記事がありません」と表示する
  // data?.articles の「?.」は、data が空(null / undefined)でもエラーにしない書き方
  if (isSuccess && isEmpty(data?.articles)) return <p className="article-preview">No articles are here... yet.</p>

  // ここまで来たら「記事が1件以上ある」状態なので、一覧を表示する
  return (
    // <> と </> … フラグメント。複数の要素(記事一覧とページボタン)をまとめて返すための「見えない箱」
    //              <div> で囲むと余計なタグが増えるので、何も増やさずにまとめたいときに使う
    <>
      {/* 記事の配列を、1件ずつ ArticlePreview(記事カード)に変換して並べる */}
      {/* key … React がリストの各要素を見分けるための目印。記事ごとに違う値の slug(記事の URL 用の名前)を使っている */}
      {data.articles.map((article) => (
        <ArticlePreview key={article.slug} article={article} />
      ))}
      {/* ページが2ページ以上あるときだけ、ページ番号ボタン(1 2 3 …)を表示する */}
      {pages > 1 && (
        <nav>
          <ul className="pagination">
            {/* Array.from({ length: pages }, ...) … ページ数と同じ個数の要素を作る */}
            {/*   例: pages が 3 なら i が 0, 1, 2 の3回処理され、ボタンが3つできる */}
            {/*   _ … 使わない引数につける名前(慣習)。ここでは i(番号)だけ使う */}
            {Array.from({ length: pages }, (_, i) => (
              // 今表示しているページのボタンだけ 'active' クラスを付けて強調表示する
              <li className={offset === i ? 'page-item active' : 'page-item'} key={i}>
                {/* ボタンが押されたら、そのページ番号に切り替える */}
                {/* → offset が変わる → 再レンダリング → 新しいページの記事を取ってくる */}
                <button type="button" className="page-link" onClick={() => setOffset(i)}>
                  {/* i は 0 から始まるので、画面には +1 して「1, 2, 3…」と表示する */}
                  {i + 1}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}

// このコンポーネントを他のファイルから import して使えるようにする
export default ArticleList
