
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'

type Workspace = {
  id: string
  name: string
}

type Props = {
  userId: string
  email: string
  onSignOut: () => Promise<void>
}

export default function WorkspaceGate({
  userId,
  email,
  onSignOut,
}: Props) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarWorkspace() {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setWorkspace(data)
      }

      setCarregando(false)
    }

    carregarWorkspace()

    return () => {
      ativo = false
    }
  }, [userId])

  async function criarWorkspace(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (nome.trim().length < 2) {
      setErro('Digite um nome com pelo menos 2 caracteres.')
      return
    }

    setSalvando(true)
    setErro('')

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: nome.trim(),
      })
      .select('id, name')
      .single()

    if (error) {
      setErro(error.message)
    } else {
      setWorkspace(data)
    }

    setSalvando(false)
  }

  if (carregando) {
    return <p style={{ padding: 30 }}>Carregando seu ambiente...</p>
  }

  if (workspace) {
  return (
    <Dashboard
      email={email}
      workspaceId={workspace.id}
      onSignOut={onSignOut}
    />
  )
}

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#f5f7f6',
      padding: 20
    }}>
      <form
        onSubmit={criarWorkspace}
        style={{
          background: 'white',
          padding: 32,
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 8px 30px #00000010'
        }}
      >
        <h1 style={{ color: '#198754' }}>
          Verdinho
        </h1>

        <h2>Crie seu espaço de trabalho</h2>

        <p>
          Digite o nome do seu negócio para começar.
        </p>

        <input
          type="text"
          placeholder="Ex.: Loja do João"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={100}
          required
          style={{
            padding: 12,
            width: '100%',
            marginBottom: 16
          }}
        />

        <button
          type="submit"
          disabled={salvando}
          style={{
            background: '#198754',
            color: 'white',
            padding: 12,
            border: 'none',
            borderRadius: 8,
            width: '100%',
            cursor: 'pointer'
          }}
        >
          {salvando ? 'Criando...' : 'Criar meu espaço'}
        </button>

        {erro && (
          <p role="alert" style={{ color: 'red' }}>
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={onSignOut}
          style={{ marginTop: 20 }}
        >
          Sair da conta
        </button>
      </form>
    </main>
  )
}
