
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ChangeEvent } from 'react'
import {
  CalendarClock,
  Send,
  Trash2,
  Image as ImageIcon,
  Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Lista = {
  id: string
  name: string
}

type Campanha = {
  id: string
  name: string
  list_id: string
  message_text: string
  image_path: string | null
  scheduled_at: string | null
  status: string
  created_at: string
}

type Props = {
  workspaceId: string
}

const BUCKET = 'campaign-images'

const campo: CSSProperties = {
  width: '100%',
  padding: 12,
  border: '1px solid #dce5df',
  borderRadius: 8,
  background: '#fff',
  color: '#17251e',
  fontSize: 14
}

const botao: CSSProperties = {
  background: '#198754',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 600
}

export default function Campanhas({ workspaceId }: Props) {
  const [listas, setListas] = useState<Lista[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])

  const [nome, setNome] = useState('')
  const [listaId, setListaId] = useState('')
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')
  const [imagem, setImagem] = useState<File | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [preview, setPreview] = useState<{
    id: string
    url: string
  } | null>(null)

  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro('')

      const [resultadoListas, resultadoCampanhas] =
        await Promise.all([
          supabase
            .from('contact_lists')
            .select('id, name')
            .eq('workspace_id', workspaceId)
            .order('name'),

          supabase
            .from('campaigns')
            .select(
              
            'id, name, list_id, message_text, image_path, scheduled_at, status, created_at')

            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
        ])

      if (!ativo) return

      if (resultadoListas.error || resultadoCampanhas.error) {
        setErro(
          resultadoListas.error?.message ??
          resultadoCampanhas.error?.message ??
          'Erro ao carregar campanhas.'
        )
      } else {
        setListas(resultadoListas.data ?? [])
        setCampanhas(resultadoCampanhas.data ?? [])
      }

      setCarregando(false)
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [workspaceId])

  function escolherImagem(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = evento.target.files?.[0] ?? null

    setErro('')

    if (!arquivo) {
      setImagem(null)
      return
    }

    if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
      setErro('Selecione uma imagem JPEG ou PNG.')
      evento.target.value = ''
      setImagem(null)
      return
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5 MB.')
      evento.target.value = ''
      setImagem(null)
      return
    }

    setImagem(arquivo)
  }

  async function criarCampanha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const nomeLimpo = nome.trim()
    const textoLimpo = mensagemTexto.trim()

    if (nomeLimpo.length < 2 || nomeLimpo.length > 100) {
      setErro('O nome deve ter entre 2 e 100 caracteres.')
      return
    }

    if (!listas.some(lista => lista.id === listaId)) {
      setErro('Selecione uma lista válida.')
      return
    }

    if (!textoLimpo || textoLimpo.length > 4096) {
      setErro('A mensagem deve ter entre 1 e 4096 caracteres.')
      return
    }

    let dataISO: string | null = null

    if (dataAgendada) {
      const data = new Date(dataAgendada)

      if (
        Number.isNaN(data.getTime()) ||
        data.getTime() <= Date.now()
      ) {
        setErro('Escolha uma data futura válida.')
        return
      }

      dataISO = data.toISOString()
    }

    setSalvando(true)

    let caminhoImagem: string | null = null

    try {
      if (imagem) {
        const extensao =
          imagem.type === 'image/png' ? 'png' : 'jpg'

        caminhoImagem =
          `${workspaceId}/${crypto.randomUUID()}.${extensao}`
        
        

        
        

        const { error: erroUpload } = await supabase
          .storage
          .from(BUCKET)
          .upload(caminhoImagem, imagem, {
            contentType: imagem.type,
            upsert: false
          })

        if (erroUpload) {
          throw new Error(
            'Erro ao enviar imagem: ' + erroUpload.message
          )
        }
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          workspace_id: workspaceId,
          name: nomeLimpo,
          list_id: listaId,
          message_text: textoLimpo,
          image_path: caminhoImagem,
          scheduled_at: dataISO,
          status: 'draft'
        })
        .select(
          'id, name, list_id, message_text, image_path, scheduled_at, status, created_at'
        )
        .single()

      if (error) throw error

      setCampanhas(anteriores => [data, ...anteriores])
      setNome('')
      setListaId('')
      setMensagemTexto('')
      setDataAgendada('')
      setImagem(null)

      if (arquivoRef.current) {
        arquivoRef.current.value = ''
      }

      setSucesso('Campanha e imagem salvas com sucesso!')
    } catch (e) {
      // Remove o arquivo se o banco não pôde salvar
      if (caminhoImagem) {
        const { error: erroLimpeza } = await supabase
          .storage
          .from(BUCKET)
          .remove([caminhoImagem])

        if (erroLimpeza) {
          console.warn('Limpeza pendente:', erroLimpeza.message)
        }
      }

      setErro(
        e instanceof Error ? e.message : 'Erro ao criar campanha.'
      )
    } finally {
      setSalvando(false)
    }
  }

  async function visualizarImagem(campanha: Campanha) {
    if (!campanha.image_path) return

    if (preview?.id === campanha.id) {
      setPreview(null)
      return
    }

    setErro('')

    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(campanha.image_path, 120)

    if (error) {
      setErro('Erro ao visualizar imagem: ' + error.message)
      return
    }

    setPreview({
      id: campanha.id,
      url: data.signedUrl
    })
  }

  async function excluirCampanha(campanha: Campanha) {
    const confirmou = window.confirm(
      `Deseja excluir a campanha "${campanha.name}"?`
    )

    if (!confirmou) return

    setErro('')
    setSucesso('')
    setExcluindo(campanha.id)

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campanha.id)
        .eq('workspace_id', workspaceId)
        .select('id')
        .single()

      if (error) throw error
      if (!data) throw new Error('Campanha não encontrada.')

      setCampanhas(anteriores =>
        anteriores.filter(item => item.id !== campanha.id)
      )

      if (preview?.id === campanha.id) {
        setPreview(null)
      }

      if (campanha.image_path) {
        const { error: erroArquivo } = await supabase
          .storage
          .from(BUCKET)
          .remove([campanha.image_path])

        if (erroArquivo) {
          setErro(
            'Campanha excluída, mas a imagem precisa ' +
            'ser removida do armazenamento.'
          )
          return
        }
      }

      setSucesso('Campanha excluída com sucesso!')
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Erro ao excluir.'
      )
    } finally {
      setExcluindo(null)
    }
  }

  function nomeDaLista(id: string) {
    return listas.find(lista => lista.id === id)?.name ??
      'Lista não encontrada'
  }

  if (carregando) {
    return <p>Carregando campanhas...</p>
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section className="verdinho-panel">
        <h2>
          <Send
            size={21}
            color="#198754"
            style={{ verticalAlign: 'middle', marginRight: 8 }}
          />
          Nova campanha
        </h2>

        <p style={{ color: '#718579', fontSize: 14 }}>
          Prepare sua campanha com texto e imagem.
          O envio ainda não está habilitado.
        </p>

        <form
          onSubmit={criarCampanha}
          style={{
            display: 'grid',
            gap: 18,
            maxWidth: 650
          }}
        >
          <label>
            Nome da campanha
            <input
              style={{ ...campo, marginTop: 6 }}
              placeholder="Ex.: Promoção de outubro"
              value={nome}
              onChange={e => setNome(e.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label>
            Lista de contatos
            <select
              style={{ ...campo, marginTop: 6 }}
              value={listaId}
              onChange={e => setListaId(e.target.value)}
              required
            >
              <option value="">Selecione uma lista</option>
              {listas.map(lista => (
                <option key={lista.id} value={lista.id}>
                  {lista.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mensagem da campanha
            <textarea
              style={{
                ...campo,
                minHeight: 140,
                resize: 'vertical',
                marginTop: 6
              }}
              placeholder="Escreva sua mensagem..."
              value={mensagemTexto}
              onChange={e => setMensagemTexto(e.target.value)}
              maxLength={4096}
              required
            />
          </label>

          <small style={{ color: '#718579' }}>
            {mensagemTexto.length}/4096 caracteres
          </small>

          <div>
            <label htmlFor="imagem-campanha">
              <ImageIcon
                size={18}
                style={{
                  verticalAlign: 'middle',
                  marginRight: 8
                }}
              />
              Imagem da campanha (opcional)
            </label>

            <input
              id="imagem-campanha"
              ref={arquivoRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={escolherImagem}
              disabled={salvando}
              style={{ display: 'block', marginTop: 12 }}
            />

            {imagem && (
              <p style={{ color: '#198754', fontSize: 13 }}>
                Selecionada: {imagem.name}
              </p>
            )}

            <small style={{ color: '#718579' }}>
              Aceitamos JPG e PNG de até 5 MB.
            </small>
          </div>

          <label>
            <CalendarClock
              size={17}
              style={{
                verticalAlign: 'middle',
                marginRight: 6
              }}
            />
            Data e horário planejados (opcional)
            <input
              type="datetime-local"
              style={{ ...campo, marginTop: 6 }}
              value={dataAgendada}
              onChange={e => setDataAgendada(e.target.value)}
            />
          </label>

          <p style={{ color: '#718579', fontSize: 13 }}>
            A campanha será salva como rascunho.
            A data não ativa o envio automático.
          </p>

          <button
            type="submit"
            style={botao}
            disabled={salvando || listas.length === 0}
          >
            {salvando ? 'Salvando...' : 'Salvar rascunho'}
          </button>
        </form>
      </section>

      <section className="verdinho-panel">
        <h2>Minhas campanhas ({campanhas.length})</h2>

        {campanhas.length === 0 ? (
          <p>Nenhuma campanha cadastrada.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {campanhas.map(campanha => (
              <article
                key={campanha.id}
                style={{
                  border: '1px solid #e6ece8',
                  borderRadius: 12,
                  padding: 18
                }}
              >
                <h3>{campanha.name}</h3>

                <p>
                  <strong>Lista:</strong>{' '}
                  {nomeDaLista(campanha.list_id)}
                </p>

                <p style={{
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere'
                }}>
                  {campanha.message_text}
                </p>

                <p>
                  <strong>Data:</strong>{' '}
                  {campanha.scheduled_at
                    ? new Date(campanha.scheduled_at)
                        .toLocaleString('pt-BR')
                    : 'Não definida'}
                </p>

                <p>Status: Rascunho — não enviado</p>

                {campanha.image_path && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      type="button"
                      style={botao}
                      onClick={() =>
                        visualizarImagem(campanha)
                      }
                    >
                      <Eye size={16} />{' '}
                      {preview?.id === campanha.id
                        ? 'Ocultar imagem'
                        : 'Visualizar imagem'}
                    </button>

                    {preview?.id === campanha.id && (
                      <img
                        src={preview.url}
                        alt={`Imagem da campanha ${campanha.name}`}
                        style={{
                          display: 'block',
                          marginTop: 14,
                          width: '100%',
                          maxWidth: 420,
                          borderRadius: 10
                        }}
                      />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={excluindo !== null}
                  onClick={() => excluirCampanha(campanha)}
                  style={{
                    ...botao,
                    background: '#fff0f0',
                    color: '#c62828'
                  }}
                >
                  <Trash2
                    size={16}
                    style={{
                      verticalAlign: 'middle',
                      marginRight: 6
                    }}
                  />
                  {excluindo === campanha.id
                    ? 'Excluindo...'
                    : 'Excluir campanha'}
                </button>
              </article>
            ))}
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
