
import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Lista = {
  id: string
  name: string
}

type Contato = {
  id: string
  name: string
  phone: string
  opted_in: boolean
}

type Props = {
  workspaceId: string
}

const campo: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: '1px solid #dce5df',
  background: '#fff',
  color: '#17251e',
  width: '100%',
  maxWidth: 420
}

const botao: CSSProperties = {
  padding: '11px 16px',
  border: 'none',
  borderRadius: 8,
  background: '#198754',
  color: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8
}

export default function Listas({ workspaceId }: Props) {
  const [listas, setListas] = useState<Lista[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [membros, setMembros] = useState<string[]>([])
  const [listaId, setListaId] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [contatoId, setContatoId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoMembros, setCarregandoMembros] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const listaAtual = listas.find(l => l.id === listaId)
  const contatosDaLista = contatos.filter(c =>
    membros.includes(c.id)
  )
  const contatosDisponiveis = contatos.filter(c =>
    !membros.includes(c.id)
  )

  function limparAvisos() {
    setErro('')
    setMensagem('')
  }

  // Carrega listas e contatos da empresa
  useEffect(() => {
    let ativo = true

    async function carregar() {
      const [resultadoListas, resultadoContatos] =
        await Promise.all([
          supabase
            .from('contact_lists')
            .select('id, name')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: true }),

          supabase
            .from('contacts')
            .select('id, name, phone, opted_in')
            .eq('workspace_id', workspaceId)
            .order('name')
        ])

      if (!ativo) return

      if (resultadoListas.error || resultadoContatos.error) {
        setErro(
          resultadoListas.error?.message ??
          resultadoContatos.error?.message ??
          'Erro ao carregar dados.'
        )
      } else {
        const novasListas = resultadoListas.data ?? []
        setListas(novasListas)
        setContatos(resultadoContatos.data ?? [])
        setListaId(atual =>
          novasListas.some(l => l.id === atual)
            ? atual
            : novasListas[0]?.id ?? ''
        )
      }

      setCarregando(false)
    }

    carregar()
    return () => { ativo = false }
  }, [workspaceId])

  // Carrega os integrantes da lista selecionada
  useEffect(() => {
    let ativo = true

    setMembros([])
    setContatoId('')

    if (!listaId) {
      setCarregandoMembros(false)
      return
    }

    setCarregandoMembros(true)

    async function carregarMembros() {
      const { data, error } = await supabase
        .from('contact_list_members')
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('list_id', listaId)

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setMembros((data ?? []).map(m => m.contact_id))
      }

      setCarregandoMembros(false)
    }

    carregarMembros()
    return () => { ativo = false }
  }, [workspaceId, listaId])

  async function criarLista(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    limparAvisos()

    const nome = novoNome.trim()

    if (nome.length < 2 || nome.length > 80) {
      setErro('O nome deve ter entre 2 e 80 caracteres.')
      return
    }

    setProcessando(true)

    const { data, error } = await supabase
      .from('contact_lists')
      .insert({
        workspace_id: workspaceId,
        name: nome
      })
      .select('id, name')
      .single()

    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe uma lista com esse nome.'
          : error.message
      )
    } else {
      setListas(anteriores => [...anteriores, data])
      setListaId(data.id)
      setNovoNome('')
      setMensagem('Lista criada com sucesso!')
    }

    setProcessando(false)
  }

  async function renomearLista() {
    if (!listaAtual) return

    const entrada = window.prompt(
      'Novo nome da lista:',
      listaAtual.name
    )

    if (entrada === null) return

    const nome = entrada.trim()

    if (nome.length < 2 || nome.length > 80) {
      setErro('O nome deve ter entre 2 e 80 caracteres.')
      return
    }

    limparAvisos()
    setProcessando(true)

    const { data, error } = await supabase
      .from('contact_lists')
      .update({ name: nome })
      .eq('id', listaAtual.id)
      .eq('workspace_id', workspaceId)
      .select('id, name')
      .single()

    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe uma lista com esse nome.'
          : error.message
      )
    } else {
      setListas(anteriores =>
        anteriores.map(l => l.id === data.id ? data : l)
      )
      setMensagem('Lista renomeada!')
    }

    setProcessando(false)
  }

  async function excluirLista() {
    if (!listaAtual) return

    const confirmado = window.confirm(
      `Excluir a lista "${listaAtual.name}"? ` +
      'Os contatos continuarão cadastrados.'
    )

    if (!confirmado) return

    limparAvisos()
    setProcessando(true)

    const { error } = await supabase
      .from('contact_lists')
      .delete()
      .eq('id', listaAtual.id)
      .eq('workspace_id', workspaceId)

    if (error) {
      setErro(error.message)
    } else {
      const restantes = listas.filter(
        l => l.id !== listaAtual.id
      )
      setListas(restantes)
      setListaId(restantes[0]?.id ?? '')
      setMensagem('Lista excluída com sucesso!')
    }

    setProcessando(false)
  }

  async function adicionarContato() {
    if (!listaId || !contatoId) return

    limparAvisos()
    setProcessando(true)

    const { error } = await supabase
      .from('contact_list_members')
      .insert({
        workspace_id: workspaceId,
        list_id: listaId,
        contact_id: contatoId
      })

    if (error) {
      setErro(error.message)
    } else {
      setMembros(anteriores => [...anteriores, contatoId])
      setContatoId('')
      setMensagem('Contato adicionado à lista!')
    }

    setProcessando(false)
  }

  async function removerContato(id: string) {
    if (!listaId) return

    limparAvisos()
    setProcessando(true)

    const { error } = await supabase
      .from('contact_list_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('list_id', listaId)
      .eq('contact_id', id)

    if (error) {
      setErro(error.message)
    } else {
      setMembros(anteriores =>
        anteriores.filter(item => item !== id)
      )
      setMensagem('Contato removido da lista!')
    }

    setProcessando(false)
  }

  if (carregando) {
    return <p>Carregando listas...</p>
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section className="verdinho-panel">
        <h2>
          <ListChecks
            size={21}
            color="#198754"
            style={{ verticalAlign: 'middle', marginRight: 8 }}
          />
          Minhas listas
        </h2>

        <form
          onSubmit={criarLista}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <input
            style={campo}
            placeholder="Ex.: Clientes interessados"
            value={novoNome}
            maxLength={80}
            onChange={e => setNovoNome(e.target.value)}
            disabled={processando}
            required
          />
          <button style={botao} disabled={processando}>
            <Plus size={17} />
            Criar lista
          </button>
        </form>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 22
        }}>
          {listas.map(lista => (
            <button
              key={lista.id}
              type="button"
              disabled={processando}
              onClick={() => {
                limparAvisos()
                setListaId(lista.id)
              }}
              style={{
                ...botao,
                background:
                  lista.id === listaId ? '#198754' : '#e8f5ee',
                color:
                  lista.id === listaId ? 'white' : '#176c45'
              }}
            >
              {lista.name}
            </button>
          ))}
        </div>

        {listas.length === 0 && (
          <p style={{ color: '#718579' }}>
            Nenhuma lista cadastrada.
          </p>
        )}
      </section>

      {listaAtual && (
        <section className="verdinho-panel">
          <h2>{listaAtual.name}</h2>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 24
          }}>
            <button
              type="button"
              style={botao}
              onClick={renomearLista}
              disabled={processando}
            >
              <Pencil size={16} />
              Renomear
            </button>

            <button
              type="button"
              onClick={excluirLista}
              disabled={processando}
              style={{
                ...botao,
                background: '#fff0f0',
                color: '#c62828'
              }}
            >
              <Trash2 size={16} />
              Excluir lista
            </button>
          </div>

          <h3>Adicionar contato</h3>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <select
              style={campo}
              value={contatoId}
              disabled={processando || carregandoMembros}
              onChange={e => setContatoId(e.target.value)}
              aria-label="Selecionar contato"
            >
              <option value="">Selecione um contato</option>
              {contatosDisponiveis.map(contato => (
                <option key={contato.id} value={contato.id}>
                  {contato.name} — {contato.phone}
                </option>
              ))}
            </select>

            <button
              type="button"
              style={botao}
              onClick={adicionarContato}
              disabled={
                !contatoId || processando || carregandoMembros
              }
            >
              <UserPlus size={17} />
              Adicionar
            </button>
          </div>

          <h3 style={{ marginTop: 30 }}>
            Contatos da lista ({contatosDaLista.length})
          </h3>

          {carregandoMembros ? (
            <p>Carregando integrantes...</p>
          ) : contatosDaLista.length === 0 ? (
            <p style={{ color: '#718579' }}>
              Esta lista ainda não possui contatos.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left'
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
                  {contatosDaLista.map(contato => (
                    <tr
                      key={contato.id}
                      style={{ borderTop: '1px solid #e6ece8' }}
                    >
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
                          disabled={processando}
                          onClick={() => removerContato(contato.id)}
                          style={{
                            ...botao,
                            background: '#fff0f0',
                            color: '#c62828'
                          }}
                        >
                          <UserMinus size={16} />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {erro && (
        <p role="alert" style={{ color: '#c62828' }}>
          {erro}
        </p>
      )}

      {mensagem && (
        <p role="status" style={{ color: '#198754' }}>
          {mensagem}
        </p>
      )}
    </div>
  )
}
