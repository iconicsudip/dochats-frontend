import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00df9a',
          colorBgBase: '#09090b',
          colorBgContainer: '#121214',
          colorText: '#ffffff',
          colorTextSecondary: '#a1a1aa',
          borderRadius: 12,
          fontFamily: 'Inter, -apple-system, sans-serif'
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AntApp>
            <App />
          </AntApp>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConfigProvider>
  </BrowserRouter>,
)
