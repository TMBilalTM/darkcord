import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login, register } = useAppStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!username.trim() || !displayName.trim()) {
          setError('Tüm alanlar gerekli')
          setLoading(false)
          return
        }
        await register(username.trim(), displayName.trim(), email, password)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-dc-bg-primary overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-dc-accent/5 blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-dc-cyan/5 blur-[128px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card */}
        <div className="rounded-2xl bg-dc-bg-secondary/80 backdrop-blur-xl border border-dc-border p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-dc-accent to-dc-cyan mb-4"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <svg viewBox="0 0 28 28" className="w-8 h-8 text-white" fill="currentColor">
                <path d="M6 14c0-1 .8-2 1.8-2 2.2 0 5.2 1.5 6.2 4.5 1-3 4-4.5 6.2-4.5 1 0 1.8 1 1.8 2 0 6-3 13-8 16C9 27 6 20 6 14z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold text-dc-text-primary tracking-tight">
              {mode === 'login' ? 'Tekrar Hoş Geldin!' : 'Hesap Oluştur'}
            </h1>
            <p className="text-sm text-dc-text-muted mt-1">
              {mode === 'login'
                ? 'Seni tekrar görmek harika!'
                : 'DarkCord macerası başlıyor'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="register-fields"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 overflow-hidden"
                >
                  <InputField
                    label="KULLANICI ADI"
                    type="text"
                    value={username}
                    onChange={setUsername}
                    placeholder="bilaltm"
                    autoComplete="username"
                  />
                  <InputField
                    label="GÖRÜNEN AD"
                    type="text"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Bilal TM"
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              label="E-POSTA"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="bilal@darkcord.app"
              autoComplete="email"
            />

            <div className="relative">
              <InputField
                label="ŞİFRE"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8.5 text-dc-text-muted hover:text-dc-text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="rounded-lg bg-dc-red/10 border border-dc-red/20 px-4 py-2.5 text-sm text-dc-red overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200',
                'bg-dc-accent text-white hover:bg-dc-accent-hover',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'
              )}
            </motion.button>
          </form>

          {/* Switch Mode */}
          <p className="text-center text-sm text-dc-text-muted mt-6">
            {mode === 'login' ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
            <button
              onClick={switchMode}
              className="text-dc-accent hover:underline font-medium"
            >
              {mode === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </p>
        </div>

        {/* Branding */}
        <p className="text-center text-[11px] text-dc-text-muted/40 mt-4 tracking-wider uppercase">
          DarkCord &mdash; by Bilal TM
        </p>
      </motion.div>
    </div>
  )
}

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-dc-text-muted mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className={cn(
          'w-full rounded-xl bg-dc-bg-primary border border-dc-border px-4 py-2.5 text-sm text-dc-text-primary',
          'placeholder:text-dc-text-muted/40 outline-none',
          'focus:border-dc-accent/50 transition-colors',
        )}
      />
    </div>
  )
}
