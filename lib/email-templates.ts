// ─── Shared styles ────────────────────────────────────────────────────────────

const body   = 'margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
const wrap   = 'background:#0f1117;padding:40px 16px;'
const card   = 'background:#161b27;border:1px solid #2a3347;border-radius:16px;padding:40px 36px;'
const muted  = 'font-size:13px;color:#5a6478;line-height:1.6;margin:0;'
const hr     = 'border:none;border-top:1px solid #2a3347;margin:28px 0;'

function logoBlock() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:linear-gradient(135deg,#4f7cff 0%,#6c4fff 100%);width:48px;height:48px;border-radius:14px;line-height:48px;text-align:center;font-size:22px;margin-bottom:10px;">⚡</div>
          <div style="font-size:20px;font-weight:700;color:#f0f4ff;letter-spacing:-0.5px;">Clubdrafter</div>
          <div style="font-size:12px;color:#5a6478;margin-top:2px;">Fantasy IPL Auction</div>
        </td>
      </tr>
    </table>`
}

function ctaButton(label: string, href: string) {
  return `
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:linear-gradient(135deg,#4f7cff 0%,#3a6eff 100%);border-radius:12px;box-shadow:0 4px 20px rgba(79,124,255,0.35);">
          <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;white-space:nowrap;">${label}</a>
        </td>
      </tr>
    </table>`
}

function footer(note: string) {
  return `
    <hr style="${hr}">
    <p style="${muted};text-align:center;">${note}</p>
    <p style="${muted};text-align:center;margin-top:4px;">© ${new Date().getFullYear()} Clubdrafter</p>`
}

// ─── Confirmation email ────────────────────────────────────────────────────────

export function confirmationEmail(displayName: string, confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Confirm your Clubdrafter account</title></head>
<body style="${body}">
<table width="100%" cellpadding="0" cellspacing="0" style="${wrap}">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td>${logoBlock()}</td></tr>
      <tr><td style="${card}">

        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f0f4ff;line-height:1.3;">
          Confirm your email
        </h1>
        <p style="margin:0 0 28px;font-size:15px;color:#8892aa;line-height:1.6;">
          Hi <strong style="color:#f0f4ff;">${displayName}</strong>, welcome to Clubdrafter!<br>
          Click the button below to verify your email and activate your account.
        </p>

        ${ctaButton('✓&nbsp; Confirm Email Address', confirmUrl)}

        <hr style="${hr}">

        <p style="${muted}">Button not working? Copy and paste this link:</p>
        <p style="margin:6px 0 0;font-size:12px;color:#4f7cff;word-break:break-all;line-height:1.6;">${confirmUrl}</p>

        ${footer('This link expires in 24 hours. If you didn\'t create an account, you can safely ignore this email.')}

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Invite email (existing user) ─────────────────────────────────────────────

export function inviteExistingUserEmail(opts: {
  hostName: string
  leagueName: string
  leagueUrl: string
}): string {
  const { hostName, leagueName, leagueUrl } = opts
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>You're invited to ${leagueName}</title></head>
<body style="${body}">
<table width="100%" cellpadding="0" cellspacing="0" style="${wrap}">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td>${logoBlock()}</td></tr>
      <tr><td style="${card}">

        <div style="display:inline-block;background:#4f7cff18;border:1px solid #4f7cff30;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:#4f7cff;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">
          League Invitation
        </div>

        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f0f4ff;line-height:1.3;">
          You've been invited!
        </h1>
        <p style="margin:0 0 6px;font-size:15px;color:#8892aa;line-height:1.6;">
          <strong style="color:#f0f4ff;">${hostName}</strong> has invited you to join their fantasy league:
        </p>
        <p style="margin:0 0 28px;font-size:22px;font-weight:700;color:#4f7cff;line-height:1.3;">${leagueName}</p>

        ${ctaButton('🏏&nbsp; Accept Invitation', leagueUrl)}

        <hr style="${hr}">

        <div style="background:#1e2535;border-radius:10px;padding:16px 18px;margin-bottom:0;">
          <p style="${muted};margin-bottom:6px;font-weight:600;color:#8892aa;">What happens next?</p>
          <p style="${muted}">1. Click the button to open the league page.</p>
          <p style="${muted}">2. Accept the invite on your dashboard.</p>
          <p style="${muted}">3. Wait for the auction to go live and build your team!</p>
        </div>

        ${footer('If you weren\'t expecting this invitation, you can ignore this email.')}

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Invite email (new user — needs to sign up first) ─────────────────────────

export function inviteNewUserEmail(opts: {
  hostName: string
  leagueName: string
  signupUrl: string
}): string {
  const { hostName, leagueName, signupUrl } = opts
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>You're invited to ${leagueName}</title></head>
<body style="${body}">
<table width="100%" cellpadding="0" cellspacing="0" style="${wrap}">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td>${logoBlock()}</td></tr>
      <tr><td style="${card}">

        <div style="display:inline-block;background:#4f7cff18;border:1px solid #4f7cff30;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:#4f7cff;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">
          League Invitation
        </div>

        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f0f4ff;line-height:1.3;">
          You've been invited!
        </h1>
        <p style="margin:0 0 6px;font-size:15px;color:#8892aa;line-height:1.6;">
          <strong style="color:#f0f4ff;">${hostName}</strong> has invited you to their fantasy league on Clubdrafter:
        </p>
        <p style="margin:0 0 28px;font-size:22px;font-weight:700;color:#4f7cff;line-height:1.3;">${leagueName}</p>

        ${ctaButton('🏏&nbsp; Create Account &amp; Join', signupUrl)}

        <hr style="${hr}">

        <div style="background:#1e2535;border-radius:10px;padding:16px 18px;margin-bottom:0;">
          <p style="${muted};margin-bottom:6px;font-weight:600;color:#8892aa;">How it works</p>
          <p style="${muted}">1. Click the button to create your free Clubdrafter account.</p>
          <p style="${muted}">2. The league will automatically appear on your dashboard.</p>
          <p style="${muted}">3. Accept the invite, then wait for the live auction!</p>
        </div>

        ${footer('If you weren\'t expecting this invitation, you can ignore this email.')}

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}
