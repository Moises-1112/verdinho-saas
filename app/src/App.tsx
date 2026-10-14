
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import WorkspaceGate from './components/WorkspaceGate'


function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!error) setSession(data.session)
      setVerificando(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cadastrar() {
    setCarregando(true)
    setMensagem('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (error) {
      setMensagem(error.message)
    } else {
      setMensagem(
        data.session
          ? 'Cadastro realizado!'
          : 'Verifique seu e-mail para confirmar o cadastro.'
      )
    }

    setCarregando(false)
  }

  async function entrar() {
    setCarregando(true)
    setMensagem('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) setMensagem(error.message)

    setCarregando(false)
  }

  async function sair() {
    const { error } = await supabase.auth.signOut()

    if (error) setMensagem(error.message)
  }

  if (verificando) {
    return <p>Carregando Verdinho...</p>
  }

  if (session) {
  return (
    <WorkspaceGate
      userId={session.user.id}
      email={session.user.email ?? 'Usuário'}
      onSignOut={sair}
    />
  )
}

  return (
    <main style={{ maxWidth: 400, margin: '60px auto' }}>
      <h1>Verdinho</h1>
      <p>Acesse sua conta</p>

      <input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Sua senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={entrar} disabled={carregando}>
          Entrar
        </button>

        <button onClick={cadastrar} disabled={carregando}>
          Criar conta
        </button>
      </div>

      <p>{mensagem}</p>
    </main>
  )
}

export default App
