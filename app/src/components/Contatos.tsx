
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Search, UserPlus, Users, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ImportarContatos from './ImportarContatos'

type Contato = {
  id: string
  name: string
  phone: string
  opted_in: boolean
  created_at: string
}

type Props = {
  workspaceId: string
}

export default function Contatos({ workspaceId }: Props) {
  const [contatos, setContatos] = useState<Contato[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [contatoEmEdicao, setContatoEmEdicao] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro('')

      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone, opted_in, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setContatos(data ?? [])
      }

      setCarregando(false)
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [workspaceId, versao])

function iniciarEdicao(contato: Contato) {
  setContatoEmEdicao(contato.id)
  setNome(contato.name)
  setTelefone(contato.phone)
  setErro('')
  setSucesso('')

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function cancelarEdicao() {
  setContatoEmEdicao(null)
  setNome('')
  setTelefone('')
  setErro('')
  setSucesso('')
}


  async function salvarContato(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const nomeLimpo = nome.trim()
    const numeroLimpo = telefone.replace(/\D/g, '')

    if (nomeLimpo.length < 2) {
      setErro('Informe um nome válido.')
      return
    }

    if (!/^[1-9]\d{9,14}$/.test(numeroLimpo)) {
      setErro('Informe o telefone com DDI e DDD. Ex.: 5511999999999.')
      return
    }

    setSalvando(true)

if (contatoEmEdicao) {
  const { data, error } = await supabase
    .from('contacts')
    .update({
      name: nomeLimpo,
      phone: numeroLimpo
    })
    .eq('id', contatoEmEdicao)
    .eq('workspace_id', workspaceId)
    .select('id, name, phone')
    .single()

  if (error) {
    setErro(
      error.code === '23505'
        ? 'Este telefone já está cadastrado.'
        : `Erro ao atualizar: ${error.message}`
    )
  } else {
    setContatos((anteriores) =>
      anteriores.map((contato) =>
        contato.id === data.id
          ? {
              ...contato,
              name: data.name,
              phone: data.phone
            }
          : contato
      )
    )

    setContatoEmEdicao(null)
    setNome('')
    setTelefone('')
    setSucesso('Contato atualizado com sucesso!')
  }

  setSalvando(false)
  return
}


    const { data, error } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        name: nomeLimpo,
        phone: numeroLimpo,
        source: 'manual',
      })
      .select('id, name, phone, opted_in, created_at')
      .single()

    if (error) {
      setErro(
        error.code === '23505'
          ? 'Esse telefone já está cadastrado.'
          : error.message
      )
    } else {
      setContatos((anteriores) => [data, ...anteriores])
      setNome('')
      setTelefone('')
      setSucesso('Contato cadastrado com sucesso!')
    }

    setSalvando(false)
  }

async function excluirContato(contato: Contato) {
  const confirmado = window.confirm(
    `Deseja realmente excluir ${contato.name}?`
  )

  if (!confirmado) return

  setErro('')
  setSucesso('')

  const { data, error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contato.id)
    .eq('workspace_id', workspaceId)
    .select('id')
    .single()

  if (error) {
    setErro(`Erro ao excluir: ${error.message}`)
    return
  }

  if (data) {
    setContatos((anteriores) =>
      anteriores.filter((item) => item.id !== contato.id)
    )

    setSucesso('Contato excluído com sucesso!')
  }
}


  const contatosFiltrados = contatos.filter((contato) => {
    const termo = pesquisa.toLowerCase()
    return (
      contato.name.toLowerCase().includes(termo) ||
      contato.phone.includes(pesquisa.replace(/\D/g, ''))
    )
  })

  const campo: React.CSSProperties = {
    padding: '12px',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #dce5df',
    background: '#fff',
    color: '#17251e',
    fontSize: '14px',
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>

    <ImportarContatos
      workspaceId={workspaceId}
      onImportado={() => setVersao((atual) => atual + 1)}
    />

    <section className="verdinho-panel">
      {/* Aqui continua o seu formulário existente */}
      
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserPlus color="#198754" size={22} />
          <h2 style={{ margin: 0 }}>
  {contatoEmEdicao ? 'Editar contato' : 'Cadastrar contato'}
</h2>
        </div>

        <form
          onSubmit={salvarContato}
          style={{
            display: 'grid',
            gap: 14,
            marginTop: 20,
            maxWidth: 500,
          }}
        >
          <label>
            <span>Nome do contato</span>
            <input
              style={{ ...campo, marginTop: 6 }}
              placeholder="Ex.: João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              maxLength={150}
            />
          </label>

          <label>
            <span>WhatsApp com DDI e DDD</span>
            <input
              style={{ ...campo, marginTop: 6 }}
              placeholder="Ex.: 5511999999999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
              type="tel"
            />
          </label>

          <button
            type="submit"
            disabled={salvando}
            style={{
              background: '#198754',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {salvando
  ? 'Salvando...'
  : contatoEmEdicao
    ? 'Salvar alterações'
    : 'Salvar contato'}
          </button>
          {contatoEmEdicao && (
  <button
    type="button"
    onClick={cancelarEdicao}
    disabled={salvando}
  >
    Cancelar edição
  </button>
)}
        </form>

        {erro && <p role="alert" style={{ color: '#c62828' }}>{erro}</p>}
        {sucesso && <p role="status" style={{ color: '#198754' }}>{sucesso}</p>}
      </section>

      <section className="verdinho-panel">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Users color="#198754" size={22} />
            <h2 style={{ margin: 0 }}>Meus contatos ({contatos.length})</h2>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 20,
          maxWidth: 450,
        }}>
          <Search size={20} color="#718579" />
          <input
            style={campo}
            placeholder="Pesquisar nome ou telefone..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>

        {carregando ? (
          <p>Carregando contatos...</p>
        ) : contatosFiltrados.length === 0 ? (
          <p style={{ color: '#718579' }}>
            Nenhum contato encontrado.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}>
              <thead>
                <tr>
                  <th style={{ padding: 12 }}>Nome</th>
                  <th style={{ padding: 12 }}>Telefone</th>
                  <th style={{ padding: 12 }}>Autorização</th>
                  <th style={{ padding: 12 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatosFiltrados.map((contato) => (
                  <tr key={contato.id} style={{
                    borderTop: '1px solid #e6ece8',
                  }}>
                    <td style={{ padding: 12 }}>{contato.name}</td>
                    <td style={{ padding: 12 }}>{contato.phone}</td>
                    <td style={{ padding: 12 }}>
                      {contato.opted_in
                        ? 'Registrada'
                        : 'Não registrada'}
                    </td>

                    <td style={{ padding: 12 }}>

                            <button
                                type="button"
                                onClick={() => iniciarEdicao(contato)}
                                title="Editar contato"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#e8f5ee',
                                    color: '#198754',
                                    border: '1px solid #c8e7d5',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    marginRight: 8
                                }}
                            >
                                <Pencil size={16} />
                                Editar
                            </button>

                    <button
                        type="button"
                        onClick={() => excluirContato(contato)}
                        title="Excluir contato"
                        aria-label={`Excluir ${contato.name}`}
                        style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#fff0f0',
                        color: '#c62828',
                        border: '1px solid #ffd5d5',
                        borderRadius: 8,
                        padding: '8px 12px',
                        cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={16} />
                        Excluir
                    </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
