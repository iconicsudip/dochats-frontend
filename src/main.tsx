import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ModuleProvider } from './contexts/ModuleContext'
import App from './App'
import './index.css'
import { APP_THEME } from './constants/brand'

if (APP_THEME === 'dark') {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

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
          <App />
        </ModuleProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>,
)
