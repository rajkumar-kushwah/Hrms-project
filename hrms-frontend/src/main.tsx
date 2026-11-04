// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthProvider from './providers/AuthProvider.tsx'
import { ThemeProvider } from '@/providers/ThemeContext.tsx'
import SocketProvider from './providers/SocketProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <SocketProvider>
      <ThemeProvider>
        {/* <StrictMode> */}
        <App />
        {/* </StrictMode> */}
      </ThemeProvider>
    </SocketProvider>
  </AuthProvider>
)
