
import { useEffect, useState } from 'react'
import {
  CalendarClock,
  Pencil,
  CalendarX,
  Save
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Agendamento = {
  id: string
  name: string
  message_text: string
  scheduled_at: string
  status: string
}

type Props = {
  workspaceId: string
}

function paraCampoLocal(iso: string) {
  const data = new Date(iso)
  const dois = (n: number) => String(n).padStart(2, '0')

  return (
    `${data.getFullYear()}-` +
    `${dois(data.getMonth() + 1)}-` +
    `${dois(data.getDate())}T` +
    `${dois(data.getHours())}:` +
    `${dois(data.getMinutes())}`
  )
}

export default function Agendamentos({ workspaceId }: Props) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [novaData, setNovaData] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, message_text, scheduled_at, status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'draft')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true })

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setAgendamentos(
          (data ?? []).filter(
            (item): item is Agendamento =>
              item.scheduled_at !== null
          )
        )
      }

      setCarregando(false)
    }

    carregar()
    return () => { ativo = false }
  }, [workspaceId])

  function iniciarEdicao(item: Agendamento) {
    setEditando(item.id)
    setNovaData(paraCampoLocal(item.scheduled_at))
    setErro('')
    setSucesso('')
  }

  async function salvarData(id: string) {
    setErro('')
    setSucesso('')

    const data = new Date(novaData)

    if (!novaData || Number.isNaN(data.getTime())) {
      setErro('Selecione uma data válida.')
      return
    }

    if (data.getTime() <= Date.now()) {
      setErro('Escolha uma data futura.')
      return
    }

    setProcessando(true)

    const { data: atualizado, error } = await supabase
      .from('campaigns')
      .update({ scheduled_at: data.toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .eq('status', 'draft')
      .select('id, scheduled_at')
      .single()

    if (error) {
      setErro(error.message)
    } else {
      setAgendamentos(anteriores =>
        anteriores
          .map(item =>
            item.id === id
              ? { ...item, scheduled_at: atualizado.scheduled_at }
              : item
          )
          .sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime()
          )
      )

      setEditando(null)
      setSucesso('Data atualizada com sucesso!')
    }

    setProcessando(false)
  }

  async function cancelarAgendamento(item: Agendamento) {
    const confirmou = window.confirm(
      `Remover a data da campanha "${item.name}"? ` +
      'A campanha continuará salva como rascunho.'
    )

    if (!confirmou) return

    setErro('')
    setSucesso('')
    setProcessando(true)

    const { error } = await supabase
      .from('campaigns')
      .update({ scheduled_at: null })
      .eq('id', item.id)
      .eq('workspace_id', workspaceId)
      .eq('status', 'draft')
      .select('id')
      .single()

    if (error) {
      setErro(error.message)
    } else {
      setAgendamentos(anteriores =>
        anteriores.filter(a => a.id !== item.id)
      )
      setEditando(null)
      setSucesso('Data removida. A campanha continua em rascunho.')
    }

    setProcessando(false)
  }

  if (carregando) {
    return <p>Carregando agendamentos...</p>
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="verdinho-panel">
        <h2>
          <CalendarClock
            size={22}
            color="#198754"
            style={{ verticalAlign: 'middle', marginRight: 8 }}
          />
          Gerenciar agendamentos
        </h2>

        <p style={{ color: '#718579', fontSize: 14 }}>
          Visualize e altere as datas planejadas das campanhas.
          O envio automático ainda não está habilitado.
        </p>

        <h3>
          Campanhas com data definida ({agendamentos.length})
        </h3>

        {agendamentos.length === 0 ? (
          <p style={{ color: '#718579' }}>
            Nenhuma campanha possui uma data planejada.
            Crie uma campanha e selecione uma data futura.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {agendamentos.map(item => {
              const passou =
                new Date(item.scheduled_at).getTime() <= Date.now()

              return (
                <article
                  key={item.id}
                  style={{
                    border: '1px solid #e6ece8',
                    borderRadius: 12,
                    padding: 20
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{item.name}</h3>

                  <p style={{ fontSize: 14 }}>
                    <strong>Data planejada:</strong>{' '}
                    {new Date(item.scheduled_at)
                      .toLocaleString('pt-BR')}
                  </p>

                  <p style={{
                    color: passou ? '#b45309' : '#198754',
                    fontSize: 13
                  }}>
                    {passou
                      ? 'Data ultrapassada — mensagem não enviada'
                      : 'Rascunho com data futura — sem envio'}
                  </p>

                  {editando === item.id ? (
                    <div style={{
                      display: 'grid',
                      gap: 12,
                      maxWidth: 360
                    }}>
                      <label htmlFor="nova-data">
                        Novo dia e horário
                      </label>

                      <input
                        id="nova-data"
                        type="datetime-local"
                        value={novaData}
                        onChange={e => setNovaData(e.target.value)}
                        style={{
                          padding: 12,
                          border: '1px solid #dce5df',
                          borderRadius: 8
                        }}
                      />

                      <button
                        type="button"
                        disabled={processando}
                        onClick={() => salvarData(item.id)}
                      >
                        <Save size={16} /> Salvar data
                      </button>

                      <button
                        type="button"
                        disabled={processando}
                        onClick={() => setEditando(null)}
                      >
                        Voltar
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap'
                    }}>
                      <button
                        type="button"
                        disabled={processando}
                        onClick={() => iniciarEdicao(item)}
                      >
                        <Pencil size={16} /> Alterar data
                      </button>

                      <button
                        type="button"
                        disabled={processando}
                        onClick={() => cancelarAgendamento(item)}
                      >
                        <CalendarX size={16} /> Remover data
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {erro && (
        <p role="alert" style={{ color: '#c62828' }}>
          {erro}
        </p>
      )}

      {sucesso && (
        <p role="status" style={{ color: '#198754' }}>
          {sucesso}
        </p>
      )}
    </div>
  )
}
