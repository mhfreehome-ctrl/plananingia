import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = 'admin' | 'editeur' | 'salarie' | 'st'

interface Step {
  title: string
  desc: string
  detail?: string
  where?: string        // "Où aller ?"
  ui?: React.ReactNode  // Mockup visuel
  tip?: string
}

interface Workflow {
  id: string
  icon: string
  title: string
  steps: Step[]
}

// ── Composants UI ──────────────────────────────────────────────────────────────

function Tag({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray:   'bg-gray-100 text-gray-600 border-gray-200',
    blue:   'bg-blue-100 text-blue-700 border-blue-200',
    green:  'bg-green-100 text-green-700 border-green-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    red:    'bg-red-100 text-red-700 border-red-200',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color] || colors.gray}`}>{children}</span>
}

// Mockup : barre de navigation sidebar
function MockupNav({ active }: { active: string }) {
  const items = ['Tableau de bord', 'Chantiers', 'Clients', 'Planning global', 'Utilisateurs', 'Équipes']
  return (
    <div className="bg-slate-800 rounded-lg p-2 text-xs w-40 flex-shrink-0">
      <div className="text-white font-bold text-[10px] px-2 py-1 mb-1 border-b border-slate-600">PlanningIA</div>
      {items.map(item => (
        <div key={item} className={`px-2 py-1 rounded text-[10px] ${item === active ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}>
          {item}
        </div>
      ))}
    </div>
  )
}

// Mockup : carte chantier
function MockupProjectCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-gray-800 text-[11px]">Résidence Les Acacias</span>
        <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-medium">Actif</span>
      </div>
      <div className="text-gray-400 text-[10px] mb-2">Lyon · 24 semaines · 15 lots</div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '42%' }} />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400">
        <span>Avancement 42%</span>
        <span>↗ Voir le détail</span>
      </div>
    </div>
  )
}

// Mockup : bouton IA
function MockupAIButton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-xl p-4 text-center">
        <div className="text-2xl mb-1">🤖</div>
        <div className="text-xs font-semibold text-indigo-700">Générer le planning avec l'IA</div>
        <div className="text-[10px] text-indigo-500 mt-0.5">Claude analysera votre projet et créera tous les lots</div>
      </div>
    </div>
  )
}

// Mockup : tableau de lots Gantt
function MockupGantt() {
  const lots = [
    { name: 'L01 VRD', w: 20, x: 0, color: '#8B4513' },
    { name: 'L02 Gros Œuvre', w: 45, x: 20, color: '#696969' },
    { name: 'L03 Charpente', w: 20, x: 65, color: '#8B6914' },
  ]
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden text-[10px]">
      <div className="bg-gray-50 border-b border-gray-200 px-2 py-1 font-semibold text-gray-600 flex gap-2">
        <span className="w-28">Lot</span>
        <span className="flex-1">Timeline</span>
      </div>
      {lots.map(lot => (
        <div key={lot.name} className="flex items-center gap-2 px-2 py-1 border-b border-gray-100">
          <span className="w-28 text-gray-700 truncate">{lot.name}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded relative">
            <div className="absolute h-4 rounded text-white text-[8px] flex items-center px-1"
              style={{ left: `${lot.x}%`, width: `${lot.w}%`, background: lot.color }}>
              {lot.w}j
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Mockup : modal assignation
function MockupAssign() {
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-gray-800 mb-2 text-[11px]">Assigner le lot L03 Charpente</div>
      <div className="space-y-1.5">
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">Sous-traitant</div>
          <div className="border border-indigo-400 bg-indigo-50 rounded px-2 py-1 text-[10px] flex items-center justify-between">
            <span>Charpente Dupont & Fils</span>
            <span className="text-indigo-600">✓</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">Équipe interne</div>
          <div className="border border-gray-200 rounded px-2 py-1 text-[10px] text-gray-400">Sélectionner...</div>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        <div className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px]">Enregistrer</div>
        <div className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">Annuler</div>
      </div>
    </div>
  )
}

// Mockup : suivi avancement
function MockupProgress() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
      <div className="font-semibold text-gray-800 mb-2 text-[11px]">L02 Gros Œuvre — Mise à jour</div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Avancement</span><span className="font-semibold text-indigo-700">65%</span>
          </div>
          <input type="range" value="65" readOnly className="w-full h-1.5 accent-indigo-600" />
        </div>
        <div className="flex gap-1">
          {['En cours', 'En attente', 'Terminé', 'Avec réserves'].map(s => (
            <span key={s} className={`text-[9px] px-1.5 py-0.5 rounded border ${s === 'En cours' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Mockup : invitation utilisateur
function MockupInvite() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-sm">
      <div className="font-semibold text-gray-800 mb-2 text-[11px]">Inviter un utilisateur</div>
      <div className="space-y-1.5">
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">Email</div>
          <div className="border border-gray-300 rounded px-2 py-1 text-[10px] text-gray-400">jean.dupont@email.com</div>
        </div>
        <div className="flex gap-1">
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">Profil</div>
            <div className="border border-indigo-400 bg-indigo-50 rounded px-2 py-1 text-[10px]">Éditeur ▾</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">Type</div>
            <div className="border border-gray-300 rounded px-2 py-1 text-[10px] text-gray-500">Salarié ▾</div>
          </div>
        </div>
      </div>
      <div className="bg-indigo-600 text-white text-center py-1 rounded mt-2 text-[10px] font-medium">📧 Envoyer l'invitation</div>
    </div>
  )
}

// Mockup : train de travaux
function MockupTrainDeTravaux() {
  const zones = ['RDC', 'R+1', 'R+2']
  const lots = [
    { code: 'IT10', dur: '15j' },
    { code: 'EN20', dur: '10j' },
    { code: 'BA30', dur: '12j' },
  ]
  return (
    <div className="text-[10px] space-y-2">
      <div className="bg-indigo-50 border border-indigo-200 rounded p-2">
        <div className="font-semibold text-indigo-800 mb-2">🚂 Résultat : 3 lots × 3 zones = 9 sous-lots</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-1.5 py-1 text-gray-500">Lot parent</th>
                {zones.map(z => <th key={z} className="px-1.5 py-1 bg-indigo-100 text-indigo-700 text-center rounded">{z}</th>)}
              </tr>
            </thead>
            <tbody>
              {lots.map(l => (
                <tr key={l.code}>
                  <td className="px-1.5 py-1 font-semibold text-gray-700">{l.code} ({l.dur})</td>
                  {zones.map(z => (
                    <td key={z} className="px-1.5 py-1 text-center">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{l.code}-{z}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-indigo-600 mt-1.5 flex items-center gap-1">
          <span>→</span><span>Sous-lots chaînés automatiquement (FS)</span>
        </div>
      </div>
    </div>
  )
}

// Mockup : dépendances
function MockupDependances() {
  return (
    <div className="text-[10px] space-y-1.5">
      {[
        { from: 'L01 Gros Œuvre', to: 'L02 Charpente', type: 'FS', lag: '0j', color: 'text-red-600' },
        { from: 'L02 Charpente', to: 'L03 Couverture', type: 'FS', lag: '+2j', color: 'text-red-600' },
        { from: 'L03 Couverture', to: 'L04 Plâtrerie', type: 'FS', lag: '0j', color: 'text-gray-500' },
      ].map((dep, i) => (
        <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5">
          <span className="font-semibold text-gray-700 flex-1 truncate">{dep.from}</span>
          <span className={`font-bold text-xs ${dep.color}`}>→ {dep.type} {dep.lag}</span>
          <span className="font-semibold text-gray-700 flex-1 truncate text-right">{dep.to}</span>
        </div>
      ))}
      <div className="text-gray-400 text-[9px] mt-1">FS = Fin-à-Début · Les lots rouges sont sur le chemin critique</div>
    </div>
  )
}

// Mockup : export PDF
function MockupExportPDF() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-2">
      <div className="font-semibold text-gray-800 text-[11px]">Exporter le planning</div>
      <div className="flex gap-2">
        {['A4 Portrait', 'A4 Paysage', 'A3 Paysage'].map(f => (
          <div key={f} className={`border rounded px-2 py-1 text-[10px] ${f === 'A4 Paysage' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-500'}`}>{f}</div>
        ))}
      </div>
      <div className="bg-indigo-600 text-white text-center py-1.5 rounded text-[10px] font-medium">📥 Télécharger le PDF</div>
    </div>
  )
}

// Mockup : vue salarié
function MockupSubView() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg text-xs">
      <div className="bg-slate-800 text-white px-3 py-2 rounded-t-lg flex items-center gap-2 text-[10px]">
        <span className="font-bold">PlanningIA</span>
        <span className="ml-auto text-slate-400">Jean D.</span>
      </div>
      <div className="p-2 space-y-1">
        {[
          { lot: 'L03 Charpente', chantier: 'Résidence Acacias', date: '12/03 → 30/03', pct: 45, color: '#8B6914' },
          { lot: 'L11 Isolation', chantier: 'Tour Bellevue', date: '15/03 → 25/03', pct: 0, color: '#90EE90' },
        ].map(item => (
          <div key={item.lot} className="border border-gray-100 rounded p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="font-semibold text-[10px] text-gray-800">{item.lot}</span>
              <span className="ml-auto text-[9px] text-gray-400">{item.chantier}</span>
            </div>
            <div className="text-[9px] text-gray-400">{item.date}</div>
            <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
              <div className="h-1 rounded-full bg-indigo-400" style={{ width: `${item.pct || 5}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Données des workflows ─────────────────────────────────────────────────────

const WORKFLOWS_ADMIN: Workflow[] = [
  {
    id: 'setup',
    icon: '🏢',
    title: 'Configurer mon entreprise',
    steps: [
      {
        title: 'Accéder à Mon Entreprise',
        desc: 'Dans le menu gauche, cliquez sur "Mon Entreprise". Renseignez le nom, l\'adresse, le type d\'activité et les types de lots utilisés par votre société.',
        where: 'Sidebar → Mon Entreprise',
        tip: 'Pour les entreprises de façade, cochez les types de lots (ITE, Enduit, Bardage…) afin que l\'IA génère le bon planning.',
        ui: <div className="flex gap-3"><MockupNav active="Mon entreprise" /><div className="flex-1 space-y-1.5">
          {['Nom de l\'entreprise', 'Type d\'activité', 'SIRET', 'Adresse'].map(f => (
            <div key={f} className="border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-400">{f}</div>
          ))}
          <div className="bg-indigo-600 text-white text-center rounded py-1.5 text-xs">Enregistrer</div>
        </div></div>
      },
    ]
  },
  {
    id: 'users',
    icon: '👥',
    title: 'Gérer les utilisateurs',
    steps: [
      {
        title: 'Inviter un salarié ou éditeur',
        desc: 'Allez dans Utilisateurs → bouton "+ Inviter". Saisissez l\'email, choisissez le profil (Admin / Éditeur / Conducteur / Salarié) et le type (Salarié / Sous-traitant). Un email d\'invitation est envoyé automatiquement.',
        where: 'Sidebar → Utilisateurs → + Inviter',
        ui: <MockupInvite />,
        tip: 'Les salariés reçoivent un lien pour créer leur mot de passe. Vous pouvez aussi définir un mot de passe temporaire et le réinitialiser via le bouton 🔑 dans la liste.',
      },
      {
        title: 'Réinitialiser un mot de passe oublié',
        desc: 'Dans la liste des utilisateurs, cliquez sur 🔑 en face de l\'utilisateur. Un mot de passe temporaire (ex: Temp4821!) est généré et affiché. Communiquez-le à l\'utilisateur qui pourra le modifier depuis son profil.',
        where: 'Utilisateurs → ligne utilisateur → 🔑',
        tip: 'Le mot de passe temporaire n\'expire pas. L\'utilisateur doit le changer dès sa première connexion.',
      },
      {
        title: 'Comprendre les profils',
        desc: 'Chaque utilisateur a un profil qui définit ses droits.',
        where: 'Utilisateurs',
        ui: <div className="space-y-1.5 text-xs">
          {[
            { label: '🔵 Admin', desc: 'Accès total : créer chantiers, inviter, configurer', color: 'bg-blue-50 border-blue-200' },
            { label: '🟢 Éditeur', desc: 'Modifier chantiers + lots, pas d\'accès utilisateurs', color: 'bg-green-50 border-green-200' },
            { label: '🟡 Conducteur', desc: 'Mettre à jour l\'avancement des lots', color: 'bg-amber-50 border-amber-200' },
            { label: '⚪ Salarié', desc: 'Lecture seule de ses lots assignés', color: 'bg-gray-50 border-gray-200' },
          ].map(r => (
            <div key={r.label} className={`border rounded px-3 py-1.5 ${r.color}`}>
              <span className="font-semibold">{r.label}</span>
              <span className="text-gray-500 ml-2 text-[11px]">{r.desc}</span>
            </div>
          ))}
        </div>
      },
    ]
  },
  {
    id: 'project',
    icon: '📁',
    title: 'Créer un chantier',
    steps: [
      {
        title: 'Nouveau chantier',
        desc: 'Cliquez sur Chantiers dans le menu, puis "+ Nouveau chantier". Renseignez le nom, l\'adresse, la date de début et la durée en semaines. Choisissez le statut initial (Préparation ou Actif).',
        where: 'Sidebar → Chantiers → + Nouveau chantier',
        ui: <MockupProjectCard />,
      },
      {
        title: 'Générer le planning avec l\'IA',
        desc: 'Depuis la fiche chantier, cliquez sur "Générer avec l\'IA". L\'IA (Claude) analyse votre projet et crée automatiquement tous les lots, les durées et les dépendances. Le calcul CPM est ensuite lancé pour optimiser les dates.',
        where: 'Chantier → Onglet Planning → Générer avec l\'IA',
        ui: <MockupAIButton />,
        tip: 'Pour un chantier de façade, l\'IA adapte les lots selon les types configurés dans votre entreprise (ITE, Enduit, Bardage…).',
      },
      {
        title: 'Consulter le Gantt',
        desc: 'Après génération, le diagramme de Gantt s\'affiche avec tous les lots. Vous pouvez déplacer les barres par glisser-déposer, modifier les durées et visualiser le chemin critique en rouge.',
        where: 'Chantier → Onglet Planning',
        ui: <MockupGantt />,
      },
    ]
  },
  {
    id: 'assign',
    icon: '🔗',
    title: 'Assigner des lots',
    steps: [
      {
        title: 'Ouvrir la fiche lot',
        desc: 'Depuis le Gantt, cliquez sur un lot pour ouvrir sa fiche. Vous pouvez y assigner un sous-traitant (entreprise externe) ou une équipe interne, définir une date limite marché, et ajouter des notes.',
        where: 'Chantier → Gantt → clic sur un lot',
        ui: <MockupAssign />,
        tip: 'Un sous-traitant assigné reçoit automatiquement une notification et peut voir ses lots depuis son espace dédié.',
      },
      {
        title: 'Créer des équipes internes',
        desc: 'Allez dans Équipes pour regrouper vos salariés. Chaque équipe a une couleur et un responsable. Vous pouvez ensuite assigner une équipe entière à un lot.',
        where: 'Sidebar → Équipes → + Créer une équipe',
      },
    ]
  },
  {
    id: 'track',
    icon: '📊',
    title: 'Suivre l\'avancement',
    steps: [
      {
        title: 'Tableau de bord',
        desc: 'La page d\'accueil présente une vue d\'ensemble de tous vos chantiers actifs : avancement, lots en retard, jalons à venir. Les chantiers hors délai sont mis en évidence.',
        where: 'Sidebar → Tableau de bord',
      },
      {
        title: 'Planning global',
        desc: 'Accédez à la vue Planning global pour voir tous les chantiers sur une même timeline. Filtrez par statut, par équipe ou par sous-traitant.',
        where: 'Sidebar → Planning global',
      },
      {
        title: 'Charge de travail',
        desc: 'Depuis la fiche d\'un salarié (Utilisateurs → 📅) ou d\'une équipe (Équipes → 📅), consultez la charge de travail sous forme de Gantt groupé par chantier.',
        where: 'Utilisateurs → 📅 ou Équipes → 📅',
      },
    ]
  },
  {
    id: 'lots-advanced',
    icon: '🏗️',
    title: 'Lots avancés : sous-tâches, sous-lots & train de travaux',
    steps: [
      {
        title: 'Sous-tâches : décomposer un lot en étapes',
        desc: 'Dans la fiche d\'un lot, onglet "Tâches", créez des sous-tâches avec leur propre statut, date et assignation. Idéal pour un lot unique avec plusieurs phases (ex. : commande → livraison → pose → finitions).',
        where: 'Chantier → Gantt → clic lot → Onglet Tâches → + Ajouter',
        tip: 'Les sous-tâches restent rattachées au lot parent et n\'apparaissent pas comme des barres indépendantes sur le Gantt.',
      },
      {
        title: 'Sous-lots par zones : découper un lot en plusieurs barres',
        desc: 'Sur la fiche d\'un lot, cliquez sur "Découper en sous-lots". Définissez les zones (ex. : Bâtiment A, Bâtiment B) ou les niveaux (RDC, R+1…). Chaque sous-lot devient une barre indépendante sur le Gantt avec sa propre durée et assignation.',
        where: 'Chantier → Gantt → clic lot → Découper en sous-lots',
        tip: 'Utilisez les sous-lots quand le même corps de métier intervient sur plusieurs zones avec des horaires décalés.',
      },
      {
        title: 'Train de travaux : répéter N lots sur M zones',
        desc: 'Le train de travaux génère automatiquement une grille N×M de sous-lots. Depuis la fiche chantier, cliquez sur "🚂 Train de travaux", choisissez les lots à répéter et définissez les zones. L\'application crée tous les sous-lots et les chaîne en Fin→Début automatiquement.',
        where: 'Chantier → Lots → 🚂 Train de travaux',
        ui: <MockupTrainDeTravaux />,
        tip: 'Après création, relancez le CPM (bouton "⚡ CPM") pour recalculer le chemin critique avec les nouveaux enchaînements.',
      },
      {
        title: 'Dépendances entre lots',
        desc: 'Sur la fiche d\'un lot, onglet "Dépendances", ajoutez les lots prédécesseurs avec le type de lien (FS = Fin-à-Début) et un délai optionnel. Le CPM recalcule ensuite les dates au plus tôt/tard et identifie le chemin critique.',
        where: 'Chantier → Gantt → clic lot → Onglet Dépendances',
        ui: <MockupDependances />,
        tip: 'Les lots sur le chemin critique apparaissent en rouge sur le Gantt. Tout retard sur ces lots retarde la fin du chantier.',
      },
    ]
  },
  {
    id: 'clients',
    icon: '🏢',
    title: 'Clients / Maîtres d\'ouvrage',
    steps: [
      {
        title: 'Créer un client',
        desc: 'Depuis le menu Clients, cliquez sur "+ Nouveau client". Renseignez le nom, l\'adresse, le contact et les éventuelles notes. Le client sera ensuite sélectionnable lors de la création d\'un chantier.',
        where: 'Sidebar → Clients → + Nouveau client',
      },
      {
        title: 'Associer un client à un chantier',
        desc: 'Lors de la création ou de la modification d\'un chantier, sélectionnez le maître d\'ouvrage dans la liste déroulante "Client". La fiche client affiche ensuite tous les chantiers associés et leur avancement.',
        where: 'Chantier → Modifier → Champ Client',
        tip: 'La vue détail d\'un client permet de voir d\'un coup d\'œil tous les projets en cours ou terminés pour ce maître d\'ouvrage.',
      },
    ]
  },
  {
    id: 'export',
    icon: '📄',
    title: 'Exporter le planning en PDF',
    steps: [
      {
        title: 'Télécharger le Gantt en PDF',
        desc: 'Depuis la fiche chantier, cliquez sur le bouton "📥 Exporter PDF". Choisissez le format (A4 Portrait, A4 Paysage ou A3 Paysage) selon la densité de votre planning. Le PDF généré capture le Gantt complet avec les couleurs et le chemin critique.',
        where: 'Chantier → Onglet Planning → 📥 Exporter PDF',
        ui: <MockupExportPDF />,
        tip: 'Pour les chantiers avec beaucoup de lots, le format A3 Paysage offre la meilleure lisibilité. Le zoom est ajusté automatiquement pour tenir sur une page.',
      },
    ]
  },
]

const WORKFLOWS_EDITEUR: Workflow[] = [
  {
    id: 'access',
    icon: '🔐',
    title: 'Votre espace de travail',
    steps: [
      {
        title: 'Se connecter',
        desc: 'Connectez-vous sur planningia.com avec l\'email et le mot de passe fournis par votre administrateur. Si vous avez reçu un email d\'invitation, cliquez sur le lien pour créer votre mot de passe.',
        where: 'planningia.com → Se connecter',
        ui: <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-xs">
          <div className="text-center font-bold text-gray-800 mb-3">PlanningIA</div>
          {['Email', 'Mot de passe'].map(f => (
            <div key={f} className="border border-gray-300 rounded px-2 py-1.5 text-gray-400 mb-2">{f}</div>
          ))}
          <div className="bg-indigo-600 text-white text-center rounded py-1.5 font-medium">Se connecter</div>
        </div>
      },
      {
        title: 'Droits éditeur',
        desc: 'En tant qu\'éditeur, vous pouvez consulter et modifier les chantiers et leurs lots (avancement, dates, notes), mais vous n\'avez pas accès à la gestion des utilisateurs ni à la configuration de l\'entreprise.',
        ui: <div className="space-y-1.5 text-xs">
          {[
            { icon: '✅', text: 'Voir et modifier les chantiers' },
            { icon: '✅', text: 'Mettre à jour l\'avancement des lots' },
            { icon: '✅', text: 'Consulter le planning global' },
            { icon: '❌', text: 'Gérer les utilisateurs' },
            { icon: '❌', text: 'Configurer l\'entreprise' },
          ].map(r => (
            <div key={r.text} className="flex items-center gap-2 text-[11px]">
              <span>{r.icon}</span><span className="text-gray-700">{r.text}</span>
            </div>
          ))}
        </div>
      },
    ]
  },
  {
    id: 'lots',
    icon: '🧱',
    title: 'Mettre à jour les lots',
    steps: [
      {
        title: 'Modifier l\'avancement d\'un lot',
        desc: 'Depuis la fiche chantier, cliquez sur un lot dans le Gantt. Dans la fenêtre qui s\'ouvre, faites glisser le curseur d\'avancement (0–100%) et changez le statut si nécessaire.',
        where: 'Chantier → Gantt → clic lot',
        ui: <MockupProgress />,
        tip: 'Le statut "Avec réserves" indique que le lot est terminé mais des points restent à lever.',
      },
      {
        title: 'Ajouter des tâches à un lot',
        desc: 'Dans la fiche lot, onglet "Tâches", créez des sous-tâches avec leur propre statut et assignation. Ces tâches permettent de décomposer le travail d\'un lot en étapes plus fines.',
        where: 'Fiche lot → Onglet Tâches → + Ajouter',
      },
      {
        title: 'Ajouter un jalon',
        desc: 'Dans la fiche chantier, onglet Jalons, créez des jalons (livraison, réception, fin de garantie…). Ils s\'affichent en repères verticaux sur le Gantt.',
        where: 'Chantier → Onglet Jalons → + Jalon',
      },
    ]
  },
  {
    id: 'planning',
    icon: '📅',
    title: 'Consulter le planning',
    steps: [
      {
        title: 'Gantt d\'un chantier',
        desc: 'Le Gantt affiche tous les lots avec leur timeline. Les barres rouges indiquent les lots sur le chemin critique (tout retard impacte la fin du projet). Survolez une barre pour voir les détails.',
        where: 'Chantier → Onglet Planning',
        ui: <MockupGantt />,
      },
      {
        title: 'Planning global multi-chantiers',
        desc: 'La vue Planning global (sidebar) affiche tous les chantiers sur une même timeline. Très utile pour anticiper les pics de charge et les conflits de ressources.',
        where: 'Sidebar → Planning global',
      },
    ]
  },
  {
    id: 'lots-advanced',
    icon: '🏗️',
    title: 'Sous-tâches, sous-lots & train de travaux',
    steps: [
      {
        title: 'Sous-tâches : étapes internes d\'un lot',
        desc: 'Dans la fiche lot, onglet "Tâches", créez des sous-tâches pour décomposer le travail en étapes (ex. : commande → livraison → pose → réception). Chaque sous-tâche a son propre statut et peut être assignée individuellement.',
        where: 'Chantier → clic lot → Onglet Tâches → + Ajouter',
      },
      {
        title: 'Train de travaux : lots répétés par zones',
        desc: 'Le bouton "🚂 Train de travaux" (fiche chantier) crée automatiquement une grille de sous-lots en croisant les lots sélectionnés avec les zones définies (niveaux, bâtiments…). Les enchaînements Fin→Début sont créés automatiquement.',
        where: 'Chantier → Lots → 🚂 Train de travaux',
        ui: <MockupTrainDeTravaux />,
        tip: 'Relancez le CPM après toute modification structurelle du planning pour recalculer le chemin critique.',
      },
      {
        title: 'Dépendances entre lots',
        desc: 'Ajoutez des liens de dépendance (Fin→Début) entre les lots depuis l\'onglet "Dépendances" de la fiche lot. Le CPM recalcule ensuite les dates et met en rouge les lots critiques.',
        where: 'Chantier → clic lot → Onglet Dépendances',
        ui: <MockupDependances />,
      },
    ]
  },
  {
    id: 'export',
    icon: '📄',
    title: 'Exporter le planning en PDF',
    steps: [
      {
        title: 'Télécharger le Gantt en PDF',
        desc: 'Cliquez sur "📥 Exporter PDF" depuis la fiche chantier. Choisissez le format (A4 ou A3, portrait ou paysage). Le PDF capture le Gantt complet avec les barres colorées et le chemin critique.',
        where: 'Chantier → Onglet Planning → 📥 Exporter PDF',
        ui: <MockupExportPDF />,
        tip: 'L\'A3 paysage est recommandé pour les chantiers denses. La mise à l\'échelle est automatique.',
      },
    ]
  },
]

const WORKFLOWS_SALARIE: Workflow[] = [
  {
    id: 'connect',
    icon: '🔑',
    title: 'Se connecter',
    steps: [
      {
        title: 'Première connexion',
        desc: 'Vous avez reçu un email d\'invitation de votre administrateur. Cliquez sur le lien dans l\'email pour créer votre mot de passe, puis connectez-vous sur planningia.com.',
        where: 'Email d\'invitation → lien → planningia.com',
        tip: 'Si vous n\'avez pas reçu d\'email, demandez à votre administrateur de vous envoyer votre mot de passe temporaire.',
      },
      {
        title: 'Mot de passe oublié',
        desc: 'Sur la page de connexion, cliquez sur "Mot de passe oublié". Entrez votre email et vous recevrez un lien de réinitialisation. Alternativement, demandez à votre admin de générer un mot de passe temporaire.',
        where: 'planningia.com → Connexion → Mot de passe oublié',
      },
    ]
  },
  {
    id: 'my-lots',
    icon: '🧱',
    title: 'Consulter mes lots',
    steps: [
      {
        title: 'Mes lots assignés',
        desc: 'Après connexion, vous accédez directement à la liste de vos lots. Chaque carte affiche le nom du lot, le chantier associé, les dates prévues et le pourcentage d\'avancement.',
        where: 'Espace salarié → Mes lots',
        ui: <MockupSubView />,
      },
      {
        title: 'Voir le planning de mes lots',
        desc: 'Cliquez sur "Mon planning" pour voir vos lots sur une timeline. Les périodes d\'intervention sur chaque chantier sont affichées semaine par semaine.',
        where: 'Espace salarié → Mon planning',
        tip: 'La ligne rouge "Aujourd\'hui" vous permet de situer où vous en êtes dans votre planning.',
      },
    ]
  },
  {
    id: 'notifs',
    icon: '🔔',
    title: 'Notifications',
    steps: [
      {
        title: 'Recevoir des alertes',
        desc: 'Vous recevez des notifications lorsque vous êtes assigné à un nouveau lot, ou lorsqu\'une date limite approche. Le badge 🔴 sur la cloche en haut à droite indique les notifications non lues.',
        where: 'Icône 🔔 en haut à droite',
        tip: 'Consultez régulièrement vos notifications pour ne pas manquer une mise à jour de planning.',
      },
    ]
  },
]

const WORKFLOWS_ST: Workflow[] = [
  {
    id: 'invite',
    icon: '📧',
    title: 'Rejoindre la plateforme',
    steps: [
      {
        title: 'Accepter l\'invitation',
        desc: 'Vous avez reçu un email d\'invitation de l\'entreprise générale. Cliquez sur le lien "Créer mon compte" dans l\'email pour définir votre mot de passe et accéder à votre espace.',
        where: 'Email d\'invitation → "Créer mon compte"',
        tip: 'Le lien d\'invitation expire après 7 jours. Si le lien est expiré, contactez l\'entreprise générale pour en recevoir un nouveau.',
      },
    ]
  },
  {
    id: 'my-lots',
    icon: '🏗️',
    title: 'Mes lots de travaux',
    steps: [
      {
        title: 'Voir mes lots assignés',
        desc: 'Depuis votre tableau de bord, consultez la liste des lots qui vous ont été attribués. Pour chaque lot, vous voyez le chantier, les dates prévues, le statut et les documents associés.',
        where: 'Espace sous-traitant → Mes lots',
        ui: <MockupSubView />,
      },
      {
        title: 'Consulter votre planning',
        desc: 'L\'onglet "Mon planning" affiche vos interventions sur une timeline. Cela vous permet de visualiser vos engagements sur les prochaines semaines et d\'anticiper les chevauchements.',
        where: 'Espace sous-traitant → Mon planning',
      },
    ]
  },
  {
    id: 'progress',
    icon: '📈',
    title: 'Mettre à jour l\'avancement',
    steps: [
      {
        title: 'Signaler l\'avancement',
        desc: 'Cliquez sur un lot pour ouvrir sa fiche. Faites glisser le curseur pour indiquer le pourcentage d\'avancement (0 à 100%). Changez le statut : En cours, En attente, Terminé, Avec réserves.',
        where: 'Mes lots → clic sur un lot → curseur avancement',
        ui: <MockupProgress />,
        tip: '"Avec réserves" signifie que le travail est terminé mais des corrections ou finitions restent à effectuer.',
      },
    ]
  },
]

// ── Composant WorkflowCard ────────────────────────────────────────────────────

function WorkflowCard({ workflow, profileColor }: { workflow: Workflow; profileColor: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className={`w-full flex items-center gap-3 px-5 py-4 ${open ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'} transition-colors`}
        onClick={() => setOpen(!open)}>
        <span className="text-xl">{workflow.icon}</span>
        <span className="font-semibold text-gray-800 text-left flex-1">{workflow.title}</span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {workflow.steps.map((step, idx) => (
            <div key={idx} className="p-5">
              <div className="flex gap-4">
                {/* Numéro étape */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full ${profileColor} text-white flex items-center justify-center text-sm font-bold`}>
                  {idx + 1}
                </div>
                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 mb-1">{step.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{step.desc}</p>

                  {step.where && (
                    <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg px-3 py-1.5 mb-3 font-mono">
                      📍 {step.where}
                    </div>
                  )}

                  {step.ui && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 overflow-x-auto">
                      {step.ui}
                    </div>
                  )}

                  {step.tip && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                      <span className="flex-shrink-0">💡</span>
                      <span>{step.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

const PROFILES: { key: Profile; label: string; icon: string; desc: string; color: string; bgColor: string; workflows: Workflow[] }[] = [
  {
    key: 'admin',
    label: 'Administrateur',
    icon: '👔',
    desc: 'Gestion complète : chantiers, utilisateurs, planning',
    color: 'bg-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    workflows: WORKFLOWS_ADMIN,
  },
  {
    key: 'editeur',
    label: 'Éditeur / Conducteur',
    icon: '🖊️',
    desc: 'Modification des lots et suivi de l\'avancement',
    color: 'bg-green-600',
    bgColor: 'bg-green-50 border-green-200',
    workflows: WORKFLOWS_EDITEUR,
  },
  {
    key: 'salarie',
    label: 'Salarié',
    icon: '👷',
    desc: 'Consultation de ses lots et planning personnel',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 border-amber-200',
    workflows: WORKFLOWS_SALARIE,
  },
  {
    key: 'st',
    label: 'Sous-traitant',
    icon: '🏗️',
    desc: 'Accès aux lots assignés et mise à jour avancement',
    color: 'bg-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    workflows: WORKFLOWS_ST,
  },
]

export default function Aide() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>(() => {
    if (!user) return 'admin'
    if (user.role === 'subcontractor') return 'st'
    if (user.access_level === 'admin') return 'admin'
    if (user.access_level === 'editeur' || user.access_level === 'conducteur') return 'editeur'
    return 'salarie'
  })

  const current = PROFILES.find(p => p.key === profile)!

  const handlePrint = () => window.print()

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
      {/* En-tête */}
      <div className="flex items-start gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mode d'emploi — PlanningIA</h1>
          <p className="text-gray-500 text-sm mt-0.5">Guide pratique par profil utilisateur · Workflows étape par étape</p>
        </div>
        <div className="ml-auto flex gap-2 flex-shrink-0">
          <button onClick={() => navigate('/docs')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            📖 Documentation complète
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            🖨️ Imprimer / PDF
          </button>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            ← Retour
          </button>
        </div>
      </div>

      {/* En-tête impression */}
      <div className="hidden print:block">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">PlanningIA — Mode d'emploi</h1>
        <p className="text-gray-500">Guide utilisateur — {current.label}</p>
        <hr className="my-3" />
      </div>

      {/* Sélecteur de profil */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        {PROFILES.map(p => (
          <button key={p.key} onClick={() => setProfile(p.key)}
            className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-center ${
              profile === p.key
                ? `${p.bgColor} border-current`
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
            <span className="text-2xl">{p.icon}</span>
            <span className={`text-sm font-semibold ${profile === p.key ? 'text-gray-800' : 'text-gray-600'}`}>{p.label}</span>
            <span className="text-xs text-gray-400 leading-tight">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Intro profil */}
      <div className={`rounded-xl border p-5 ${current.bgColor}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{current.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{current.label}</h2>
            <p className="text-sm text-gray-600">{current.desc}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Tag color="blue">planningia.com</Tag>
          <Tag color="gray">Support : votre administrateur</Tag>
          {profile === 'admin' && <Tag color="purple">Accès complet à toutes les fonctionnalités</Tag>}
          {profile === 'editeur' && <Tag color="green">Modification lots + planning</Tag>}
          {profile === 'salarie' && <Tag color="amber">Lecture seule de vos lots</Tag>}
          {profile === 'st' && <Tag color="purple">Espace sous-traitant dédié</Tag>}
        </div>
      </div>

      {/* Workflows */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          📋 Workflows
          <span className="text-sm text-gray-400 font-normal">{current.workflows.length} section(s)</span>
        </h3>
        {current.workflows.map(wf => (
          <WorkflowCard key={wf.id} workflow={wf} profileColor={current.color} />
        ))}
      </div>

      {/* FAQ rapide */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-gray-700">❓ Questions fréquentes</h3>
        <div className="space-y-2">
          {[
            { q: 'Je ne peux pas me connecter', a: 'Vérifiez votre email et mot de passe. Si vous avez oublié votre mot de passe, cliquez sur "Mot de passe oublié" sur la page de connexion, ou contactez votre administrateur pour un mot de passe temporaire.' },
            { q: 'Je ne vois pas certains menus', a: 'L\'affichage dépend de votre profil. Les salariés et conducteurs ont un accès limité. Contactez votre admin si vous pensez que des droits manquent.' },
            { q: 'Le planning généré par l\'IA ne correspond pas', a: 'Assurez-vous que les types de lots de votre entreprise sont bien configurés (Mon Entreprise). Vous pouvez régénérer le planning ou modifier manuellement les lots dans le Gantt.' },
            { q: 'Le chemin critique n\'est pas à jour après mes modifications', a: 'Après toute modification structurelle (ajout de lots, de dépendances, train de travaux), relancez manuellement le calcul CPM via le bouton "⚡ CPM" dans la fiche chantier.' },
            { q: 'Comment créer un train de travaux ?', a: 'Depuis la fiche chantier, onglet Lots, cliquez sur "🚂 Train de travaux". Sélectionnez les lots parents, définissez les zones (niveaux, bâtiments) et cliquez sur "Créer". Les sous-lots sont générés et chaînés automatiquement.' },
            { q: 'Je n\'ai pas reçu l\'email d\'invitation', a: 'Vérifiez vos spams. Si l\'email n\'est toujours pas là, demandez à votre administrateur de réinitialiser votre mot de passe depuis la liste des utilisateurs.' },
          ].map(item => (
            <details key={item.q} className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-indigo-600 py-1 select-none">
                🔹 {item.q}
              </summary>
              <p className="text-sm text-gray-600 mt-1 pl-5 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Pied de page */}
      <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        PlanningIA · Guide utilisateur v1.1 · planningia.com
      </div>

      {/* Styles impression */}
      <style>{`
        @media print {
          body { font-size: 11pt; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          @page { margin: 2cm; }
          details { display: block; }
          details summary { font-weight: bold; }
          details summary::after { content: ""; }
        }
      `}</style>
    </div>
  )
}
