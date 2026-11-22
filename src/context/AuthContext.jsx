import { createContext, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return undefined

    const applySession = (nextSession) => {
      setSession(nextSession)
      const nextUser = nextSession?.user ?? null
      setUser((prev) => ((prev?.id ?? null) === (nextUser?.id ?? null) ? prev : nextUser))
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase
      ? supabase.auth.signInWithPassword({ email, password })
      : Promise.resolve({
          data: { session: null, user: null },
          error: new Error('Authentication is not configured'),
        })

  const signUp = (email, password, name, username) =>
    supabase
      ? supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, username } },
        })
      : Promise.resolve({
          data: { session: null, user: null },
          error: new Error('Authentication is not configured'),
        })

  const signOut = async () => {
    if (supabase && session?.user) {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', session.user.id)
    }
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
