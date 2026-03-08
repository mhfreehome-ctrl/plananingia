import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useT } from '../i18n'

export default function AcceptInvite() {
  const t = useT()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    setLoading(true); setError('')
    try {
      await api.auth.acceptInvite(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">{t('app.name')}</h1>
          <p className="text-primary-300 mt-1">{t('auth.invite_title')}</p>
        </div>
        {done ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-green-600 text-lg font-semibold mb-2">✓ Compte activé !</div>
            <p className="text-gray-600 text-sm">Redirection vers la connexion...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
            {!token && <div className="text-red-600 text-sm">Token d'invitation invalide ou manquant.</div>}
            <div className="field">
              <label className="label">{t('auth.new_password')}</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="field">
              <label className="label">Confirmer le mot de passe</label>
              <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading || !token} className="btn btn-primary w-full justify-center">
              {loading ? t('common.loading') : t('auth.set_password')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
