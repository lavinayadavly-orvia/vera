import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import HondaDashboard from './pages/HondaDashboard'
import './index.css'

const pathname =
  typeof window === 'undefined' ? '/' : window.location.pathname.replace(/\/+$/, '') || '/'

const RootComponent = pathname === '/honda-r2r' ? HondaDashboard : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Toaster position="top-right" />
    <RootComponent />
  </React.StrictMode>,
) 
