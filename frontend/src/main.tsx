import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global handler to suppress benign generic unhandled promise rejections (often from Recharts/ReactRouter)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && !(event.reason instanceof Error)) {
    event.preventDefault(); // Suppress the 'Uncaught (in promise) Object' console error
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
