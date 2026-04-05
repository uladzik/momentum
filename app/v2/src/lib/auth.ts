import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { supabase } from './supabase'

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
}

// ─── Passkeys (WebAuthn) ──────────────────────────────────────────────────────

export async function signInWithPasskey() {
  if (!supabase) throw new Error('Supabase not configured')

  // 1. Get challenge from Supabase
  const { data: options, error: optErr } = await supabase.functions.invoke(
    'passkey-authenticate',
    { body: { action: 'options' } }
  )
  if (optErr) throw optErr

  // 2. Browser prompts Face ID / Touch ID / Windows Hello
  const credential = await startAuthentication({ optionsJSON: options })

  // 3. Verify with Supabase
  const { data, error } = await supabase.functions.invoke(
    'passkey-authenticate',
    { body: { action: 'verify', credential } }
  )
  if (error) throw error

  // 4. Set session from returned JWT
  if (data?.access_token) {
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
  }
}

export async function registerPasskey() {
  if (!supabase) throw new Error('Supabase not configured')

  const { data: options, error: optErr } = await supabase.functions.invoke(
    'passkey-register',
    { body: { action: 'options' } }
  )
  if (optErr) throw optErr

  const credential = await startRegistration({ optionsJSON: options })

  const { error } = await supabase.functions.invoke(
    'passkey-register',
    { body: { action: 'verify', credential } }
  )
  if (error) throw error
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
