import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './i18n/LanguageContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '2rem' }}>
          <div style={{ maxWidth: '600px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', marginBottom: '1rem' }}>⚠️ Se detectó un error en la interfaz</h2>
            <pre style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.875rem', color: '#cbd5e1' }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => { localStorage.clear(); window.location.href = '/crm'; }}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#8b5cf6', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                Limpiar Sesión y Recargar
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#334155', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <App />
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
