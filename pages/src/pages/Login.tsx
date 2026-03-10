import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useI18n, useT } from '../i18n'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      const { user } = useAuth.getState()
      navigate(user?.role === 'admin' ? '/dashboard' : '/sub', { replace: true })
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('Too many') || msg.includes('retry_after')) {
        setError('Trop de tentatives — réessayez dans quelques minutes')
      } else if (msg.includes('Internal server') || msg.includes('Request failed')) {
        setError('Erreur serveur — réessayez dans un instant')
      } else {
        setError(t('auth.error'))
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      {/* Lang toggle */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setLang('fr')} className={`text-sm px-3 py-1 rounded-full ${lang === 'fr' ? 'bg-white text-primary-900 font-semibold' : 'text-white/70 hover:text-white'}`}>FR</button>
        <button onClick={() => setLang('tr')} className={`text-sm px-3 py-1 rounded-full ${lang === 'tr' ? 'bg-white text-primary-900 font-semibold' : 'text-white/70 hover:text-white'}`}>TR</button>
      </div>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500 mb-4 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">{t('app.name')}</h1>
          <p className="text-primary-300 mt-1 text-sm">{t('app.tagline')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div className="field">
            <label className="label">{t('auth.email')}</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="field">
            <label className="label">{t('auth.password')}</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
            {loading ? t('common.loading') : t('auth.login')}
          </button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-800 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
