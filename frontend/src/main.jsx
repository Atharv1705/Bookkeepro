import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initScrollReveal } from './utils/scrollReveal.js'
import { initMotion } from './utils/motion.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initScrollReveal()
initMotion()
