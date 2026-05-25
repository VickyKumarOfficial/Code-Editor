import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'monaco-editor/min/vs/editor/editor.main.css'
import './monacoEnv'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
