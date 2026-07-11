// WebAuthn helpers for Face ID / fingerprint sign-in.
//
// Honesty note: this app has no backend, so there's no server to store a
// public key and verify a signed challenge on every login. What this DOES
// do is run the real platform ceremony — the actual OS Face ID / Touch ID /
// Windows Hello prompt appears, and only a real biometric match lets it
// through. What it does NOT do is cryptographically prove that assertion to
// a server. Treat this as a UX-real, security-adjacent demo, not a hardened
// auth system. See the Privacy & Security screen for the same caveat.

const STORAGE_PREFIX = 'bedside-biometric-'

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBuffer(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  const str = atob(padded)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i += 1) bytes[i] = str.charCodeAt(i)
  return bytes.buffer
}

export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function biometricLabel() {
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || navigator.userAgentData?.platform || ''
  if (/iPhone|iPad|iPod/.test(ua)) return 'Face ID'
  if (/Mac/.test(platform)) return 'Touch ID'
  if (/Win/.test(platform)) return 'Windows Hello'
  if (/Android/.test(ua)) return 'fingerprint'
  return 'biometric sign-in'
}

function hasEnrolledCredential(profileId) {
  return Boolean(localStorage.getItem(STORAGE_PREFIX + profileId))
}

async function enroll(profileId, displayName) {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Bedside', id: window.location.hostname },
      user: { id: new TextEncoder().encode(profileId), name: profileId, displayName },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
    },
  })
  if (!credential) return false
  localStorage.setItem(STORAGE_PREFIX + profileId, bufferToBase64url(credential.rawId))
  return true
}

async function verify(profileId) {
  const storedId = localStorage.getItem(STORAGE_PREFIX + profileId)
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      allowCredentials: storedId ? [{ id: base64urlToBuffer(storedId), type: 'public-key' }] : undefined,
      userVerification: 'required',
      timeout: 60000,
    },
  })
  return Boolean(assertion)
}

// Enrolls on first use per profile+device (the enrollment ceremony itself
// requires a real biometric match, so it doubles as sign-in), verifies on
// every use after that.
export async function authenticateWithBiometric(profileId, displayName) {
  if (hasEnrolledCredential(profileId)) {
    return verify(profileId)
  }
  return enroll(profileId, displayName)
}
