const DEFAULT_FROM = 'PlanningIA <noreply@planningia.com>'
const APP_URL = 'https://www.planningia.com'

export async function sendEmail(
  apiKey: string | undefined,
  from: string | undefined,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!apiKey || !to) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from || DEFAULT_FROM, to: [to], subject, html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[email] Resend error ${res.status}: ${body}`)
    }
  } catch (err) {
    console.error('[email] fetch error:', err)
  }
}

function base(content: string): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#374151;">
  <div style="background:#1e3a5f;padding:20px 24px;border-radius:8px 8px 0 0;">
    <span style="color:white;font-size:20px;font-weight:700;">📐 PlanningIA</span>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    ${content}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">PlanningIA — Coordination BTP · <a href="${APP_URL}" style="color:#9ca3af;">${APP_URL}</a></p>
  </div>
</div>`
}

function cta(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${label} →</a>`
}

export function htmlLotAssigned(opts: {
  firstName: string
  lotCode: string
  lotName: string
  projectName: string
  companyName?: string | null
  startDate?: string | null
  endDate?: string | null
}): string {
  const companyLine = opts.companyName
    ? `<p style="background:#f0f9ff;padding:10px 12px;border-radius:6px;margin-bottom:12px;">🏢 <strong>Entreprise :</strong> ${opts.companyName}</p>`
    : ''
  const dates = opts.startDate
    ? `<p style="background:#eff6ff;padding:12px;border-radius:6px;">📅 <strong>Période prévue :</strong> ${opts.startDate}${opts.endDate ? ` → ${opts.endDate}` : ''}</p>`
    : ''
  return base(`
    <h2 style="color:#1e3a5f;margin-top:0;">Nouveau lot assigné</h2>
    <p>Bonjour ${opts.firstName || ''},</p>
    ${companyLine}
    <p>Le lot <strong>${opts.lotCode} — ${opts.lotName}</strong> du projet <strong>${opts.projectName}</strong> vous a été assigné.</p>
    ${dates}
    ${cta('Voir dans PlanningIA', APP_URL + '/sub/lots')}
  `)
}

export function htmlDatesUpdated(opts: {
  firstName: string
  lotCode: string
  lotName: string
  projectName: string
  companyName?: string | null
  startDate: string
  endDate?: string | null
}): string {
  const dateRange = opts.endDate ? `${opts.startDate} → ${opts.endDate}` : opts.startDate
  const companyLine = opts.companyName
    ? `<p style="background:#f0f9ff;padding:10px 12px;border-radius:6px;margin-bottom:12px;">🏢 <strong>Entreprise :</strong> ${opts.companyName}</p>`
    : ''
  return base(`
    <h2 style="color:#d97706;margin-top:0;">⚠️ Planning modifié</h2>
    <p>Bonjour ${opts.firstName || ''},</p>
    ${companyLine}
    <p>Les dates de votre lot <strong>${opts.lotCode} — ${opts.lotName}</strong> (projet <strong>${opts.projectName}</strong>) ont été modifiées.</p>
    <p style="background:#fef3c7;padding:12px;border-radius:6px;">📅 <strong>Nouvelles dates :</strong> ${dateRange}</p>
    ${cta('Voir dans PlanningIA', APP_URL + '/sub/lots')}
  `)
}

export function htmlPasswordReset(opts: {
  firstName: string
  resetUrl: string
}): string {
  return base(`
    <h2 style="color:#1e3a5f;margin-top:0;">🔑 Réinitialisation de mot de passe</h2>
    <p>Bonjour ${opts.firstName || ''},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe PlanningIA.</p>
    <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.</p>
    ${cta('Réinitialiser mon mot de passe', opts.resetUrl)}
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
  `)
}

export function htmlInvite(opts: {
  firstName?: string
  companyName: string
  accessLabel: string
  inviteUrl: string
}): string {
  return base(`
    <h2 style="color:#1e3a5f;margin-top:0;">🎉 Invitation PlanningIA</h2>
    <p>Bonjour${opts.firstName ? ' ' + opts.firstName : ''},</p>
    <p>Vous avez été invité(e) à rejoindre la plateforme <strong>PlanningIA</strong> pour l'entreprise :</p>
    <p style="background:#eff6ff;padding:12px;border-radius:6px;font-weight:600;">🏢 ${opts.companyName}</p>
    <p>Votre rôle : <strong>${opts.accessLabel}</strong></p>
    <p>Cliquez ci-dessous pour activer votre compte et définir votre mot de passe :</p>
    ${cta('Activer mon compte', opts.inviteUrl)}
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;">Ce lien est valable 7 jours. Si vous n'êtes pas concerné(e), ignorez cet email.</p>
  `)
}

export function htmlProgressUpdate(opts: {
  adminFirstName: string
  subName: string
  lotCode: string
  lotName: string
  projectName: string
  percent: number
  comment?: string | null
}): string {
  const commentLine = opts.comment
    ? `<p style="font-style:italic;color:#6b7280;">"${opts.comment}"</p>`
    : ''
  return base(`
    <h2 style="color:#1e3a5f;margin-top:0;">Avancement mis à jour</h2>
    <p>Bonjour ${opts.adminFirstName || ''},</p>
    <p><strong>${opts.subName}</strong> a mis à jour l'avancement du lot <strong>${opts.lotCode} — ${opts.lotName}</strong> (projet <strong>${opts.projectName}</strong>).</p>
    <p style="background:#ecfdf5;padding:12px;border-radius:6px;">📊 <strong>Avancement : ${opts.percent}%</strong></p>
    ${commentLine}
    ${cta('Voir dans PlanningIA', APP_URL + '/projects')}
  `)
}
