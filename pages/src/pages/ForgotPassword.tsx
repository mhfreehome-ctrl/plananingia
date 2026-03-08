import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500 mb-4 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Mot de passe oublié</h1>
          <p className="text-primary-300 mt-1 text-sm">PlanningIA — Coordination BTP</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Email envoyé !</h2>
              <p className="text-sm text-gray-600">
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un email avec un lien de réinitialisation valable 1 heure.
              </p>
              <Link to="/login" className="btn btn-primary w-full justify-center block text-center">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-600">
                Entrez votre adresse email. Vous recevrez un lien pour réinitialiser votre mot de passe.
              </p>
              <div className="field">
                <label className="label">Adresse email</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" required placeholder="vous@exemple.com" />
              </div>
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">{error}</div>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
                {loading ? 'Envoi...' : 'Envoyer le lien'}
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
