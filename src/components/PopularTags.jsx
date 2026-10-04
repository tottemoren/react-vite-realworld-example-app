// React を使うための読み込み
import React from 'react'
// react-query というライブラリから、useQuery という関数だけを取り出して使えるようにする
import { useQuery } from 'react-query'

// 「人気のタグ一覧」を表示するコンポーネント（画面の部品）
// { onTagClick } … 親（pages/Home.jsx）から「タグがクリックされたら呼んでほしい関数」を受け取っている
//                  呼ぶ側では <PopularTags onTagClick={onTagClick} /> のように渡している
function PopularTags({ onTagClick }) {
  // useQuery で '/tags' の API（GET /tags）からタグ一覧を取ってくる
  // 受け取るもの:
  //   data       … 取ってきたデータ。中身は { tags: ['react', 'java', ...] } の形
  //   isFetching … 通信中なら true
  //   isError    … 通信に失敗したら true
  // placeholderData … データが届くまでの仮の値。これがないと最初は data が undefined になり、
  //                   下の data.tags.map(...) がエラーになってしまう
  // ※ キーの '/tags' がそのまま URL として使われるのは、main.jsx の defaultQueryFn の設定による
  const { data, isFetching, isError } = useQuery('/tags', { placeholderData: { tags: [] } })

  // タグ一覧の「中身」の部分だけを作る関数
  // 状態によって表示を出し分ける（useQuery は状態を教えるだけで、何を表示するかはここで決めている）
  function content() {
    // 通信中なら「読み込み中」と表示して、ここで終わり
    if (isFetching) return <p>Loading tags...</p>
    // 失敗したら「失敗しました」と表示して、ここで終わり
    if (isError) return <p>Loading tags failed :(</p>

    // 成功した場合: タグの配列を、1つずつ <a>（リンク）の要素に変換して返す
    // map … 配列の各要素に同じ処理をして、新しい配列を作る
    //       例: ['react', 'java'] → [<a>react</a>, <a>java</a>]
    return data.tags.map((tag) => (
      <a
        href="#"
        // key … React がリストの各要素を見分けるための目印。リストを map で作るときは必須
        key={tag}
        // className … CSS のクラス名（見た目を整えるため）。HTML の class と同じ意味
        className="tag-pill tag-default"
        // タグがクリックされたときの処理
        onClick={(e) => {
          // <a href="#"> の本来の動き（ページの先頭へ移動）を止める
          e.preventDefault()

          // 親から受け取った関数に、クリックされたタグ名を渡して呼ぶ
          // → Home.jsx 側で、そのタグの記事だけを表示するように切り替わる
          onTagClick(tag)
        }}
      >
        {/* タグ名を画面に表示する */}
        {tag}
      </a>
    ))
  }

  // このコンポーネントが画面に表示する全体の形
  // return が2つあるのは役割が違うから:
  //   - 下の return … コンポーネント全体の「外枠」（見出しと箱）。こちらがコンポーネントとしての戻り値
  //   - 上の content() の return … 箱の「中身」だけ（読み込み中 / 失敗 / タグ一覧）
  // {content()} の部分で上の関数を呼び、その結果を箱の中に埋め込んでいる
  // こう分けると、外枠はいつも同じで、中身だけ状態によって変える、という書き方ができる
  return (
    <div className="sidebar">
      <p>Popular Tags</p>
      <div className="tag-list">{content()}</div>
    </div>
  )
}

// このコンポーネントを他のファイルから import して使えるようにする
export default PopularTags
