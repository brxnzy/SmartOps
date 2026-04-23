import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { SupportImpersonationProvider } from './context/SupportImpersonationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <SupportImpersonationProvider>
        <App />
      </SupportImpersonationProvider>
    </AuthProvider>
  </BrowserRouter>
)
