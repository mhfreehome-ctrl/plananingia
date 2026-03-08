import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return }
    setLoading(true); setError('')
    try {
      await api.auth.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (e: any) {
      setError(e.message || 'Token invalide ou expiré')
    } finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-red-600 font-semibold">Lien invalide ou manquant.</p>
          <Link to="/forgot-password" className="btn btn-primary block">Demander un nouveau lien</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500 mb-4 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
          <p className="text-primary-300 mt-1 text-sm">PlanningIA — Coordination BTP</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Mot de passe modifié !</h2>
              <p className="text-sm text-gray-500">Redirection vers la connexion...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="field">
                <label className="label">Nouveau mot de passe</label>
                <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password" required minLength={8} placeholder="8 caractères minimum" />
              </div>
              <div className="field">
                <label className="label">Confirmer le mot de passe</label>
                <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password" required minLength={8} />
              </div>
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">{error}</div>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
                {loading ? 'Modification...' : 'Enregistrer le nouveau mot de passe'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:underline">← Retour à la connexion</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
