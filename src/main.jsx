import React from 'react'
import ReactDOM from 'react-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { createServer } from 'miragejs'
import axios from 'axios'
import App from './App'
import makeServer from './server'
import { authActions } from './hooks/useAuth'

// VITE_API_URL があればそのバックエンド（例: ローカルの Spring Boot）に接続する
const apiUrl = import.meta.env.VITE_API_URL

if (apiUrl) {
  axios.defaults.baseURL = apiUrl
} else if (process.env.NODE_ENV === 'production') {
  axios.defaults.baseURL = 'https://api.realworld.io/api'
}

const defaultQueryFn = async ({ queryKey }) => {
  const { data } = await axios.get(queryKey[0], { params: queryKey[1] })
  return data
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 300000,
    },
  },
})

// API が 401（トークン期限切れなど）を返したら、ログアウトしてログイン画面に移動する（#1）
// 通信している全ファイルで個別に処理しなくて済むよう、interceptor で 1 か所にまとめている
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = error.response?.status === 401
    // ログイン失敗を 401 で返すバックエンドもあるため、ログインの通信は対象外にする
    // （対象にすると、エラーメッセージが出る前にログイン画面が読み込み直されてしまう）
    const isLoginRequest = error.config?.url === '/users/login'

    if (isUnauthorized && !isLoginRequest) {
      authActions.logout()
      // 別のユーザーでログインし直したときに、前のユーザーのデータが表示されないようにする
      queryClient.clear()

      // interceptor はコンポーネントの外なので useNavigate は使えない。
      // 複数の通信が同時に 401 になっても、移動は 1 回で済むようにしている
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    // 呼び出し元でも、今までどおりエラーとして扱えるようにする
    return Promise.reject(error)
  }
)

if (window.Cypress && process.env.NODE_ENV === 'test') {
  const cyServer = createServer({
    routes() {
      ;['get', 'put', 'patch', 'post', 'delete'].forEach((method) => {
        this[method]('/*', (schema, request) => window.handleFromCypress(request))
      })
    },
  })
  cyServer.logging = false
} else if (!apiUrl && process.env.NODE_ENV === 'development') {
  makeServer({ environment: 'development' })
}

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} containerElement="div" />
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
