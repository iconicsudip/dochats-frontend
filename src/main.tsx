import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import { ModuleProvider } from './contexts/ModuleContext'
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModuleProvider>
          <AntApp>
            <App />
          </AntApp>
        </ModuleProvider>
      </AuthProvider>

    </QueryClientProvider>
  </BrowserRouter>,
)
