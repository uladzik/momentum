import { useState } from 'react'
import { Fingerprint, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle, signInWithPasskey } from '@/lib/auth'

type State = 'idle' | 'loading-passkey' | 'loading-google' | 'error'

export function Login() {
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePasskey() {
    setState('loading-passkey')
    setErrorMsg('')
    try {
      await signInWithPasskey()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      // User cancelled — not an error worth showing
      if (msg.includes('cancelled') || msg.includes('abort')) {
        setState('idle')
        return
      }
      setErrorMsg(msg)
      setState('error')
    }
  }

  async function handleGoogle() {
    setState('loading-google')
    setErrorMsg('')
    try {
      await signInWithGoogle()
      // Page will redirect — no need to reset state
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setState('error')
    }
  }

  const busy = state === 'loading-passkey' || state === 'loading-google'

  return (
    <div className="min-h-svh bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-card border border-border mb-4">
            <span className="text-xl">⚡</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Momentum</h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal progress dashboard</p>
        </div>

        {/* Auth card */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-6 py-6 shadow-sm">

          {/* Passkey — primary */}
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handlePasskey}
            disabled={busy}
          >
            {state === 'loading-passkey'
              ? <Loader2 size={16} className="animate-spin" />
              : <Fingerprint size={16} />
            }
            Continue with Passkey
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Face ID · Touch ID · Windows Hello
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google — secondary */}
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={busy}
          >
            {state === 'loading-google'
              ? <Loader2 size={16} className="animate-spin" />
              : <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            }
            Continue with Google
          </Button>

          {/* Error */}
          {state === 'error' && errorMsg && (
            <p className="text-xs text-destructive text-center mt-1">{errorMsg}</p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          By signing in you agree to our terms.
        </p>
      </div>
    </div>
  )
}
