import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Carlito = metrik-kompatibler Calibri-Klon (offline gebündelt, geräteübergreifend identisch).
// Nur Latin-Subset (deckt DE/EN inkl. Umlaute), Regular + Bold — wie echtes Calibri.
import '@fontsource/carlito/latin-400.css'
import '@fontsource/carlito/latin-700.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
