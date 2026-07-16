import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { startVisitDigestPrefetch } from './lib/api'
import './index.css'

// Kick off the digest fetch immediately on page load. At ~58s live latency,
// waiting until the modal opens means a one-minute spinner in front of judges;
// firing here means the fetch is (usually) already resolved by the time the
// timeline auto-opens the modal.
startVisitDigestPrefetch()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
