import { useNavigate } from 'react-router-dom'

export default function Docs() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 lg:-m-6">
      {/* Barre supérieure */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div className="flex-1" />
        <span className="text-sm font-medium text-gray-700">📖 Mode d'emploi</span>
        <div className="flex-1" />
        <a
          href="/docs/mode-emploi.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Plein écran
        </a>
      </div>

      {/* Iframe pleine hauteur */}
      <iframe
        src="/docs/mode-emploi.html"
        title="Mode d'emploi PlanningIA"
        className="flex-1 w-full border-0"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
