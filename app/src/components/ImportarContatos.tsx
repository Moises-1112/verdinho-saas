
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'

type ContatoImportado = {
  name: string
  phone: string
}

type Props = {
  workspaceId: string
  onImportado: () => void
}

function normalizarCabecalho(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export default function ImportarContatos({
  workspaceId,
  onImportado,
}: Props) {
  const [contatos, setContatos] = useState<ContatoImportado[]>([])
  const [invalidos, setInvalidos] = useState(0)
  const [duplicados, setDuplicados] = useState(0)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)

  async function selecionarArquivo(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return

    setContatos([])
    setMensagem('')
    setErro('')
    setInvalidos(0)
    setDuplicados(0)
    setLendo(true)

    try {
      if (arquivo.size > 2 * 1024 * 1024) {
        throw new Error('O arquivo deve ter no máximo 2 MB.')
      }

      const extensao = arquivo.name.split('.').pop()?.toLowerCase()
      let linhas: unknown[][]

      if (extensao === 'csv') {
        const texto = await arquivo.text()
        const resultado = Papa.parse<string[]>(texto, {
          skipEmptyLines: 'greedy',
        })

        if (resultado.errors.length > 0) {
          throw new Error('Não foi possível interpretar o CSV.')
        }

        linhas = resultado.data
      } else if (extensao === 'xlsx') {
        linhas = await readSheet(arquivo)
      } else {
        throw new Error('Selecione um arquivo CSV ou XLSX.')
      }

      if (linhas.length < 2) {
        throw new Error('Planilha sem contatos para importar.')
      }

      if (linhas.length - 1 > 500) {
        throw new Error(
          'Para esta versão, importe até 500 linhas por arquivo.'
        )
      }

      const cabecalho = linhas[0].map(normalizarCabecalho)

      const indiceNome = cabecalho.findIndex((coluna) =>
        ['nome', 'name', 'contato'].includes(coluna)
      )

      const indiceTelefone = cabecalho.findIndex((coluna) =>
        [
          'telefone',
          'phone',
          'whatsapp',
          'celular',
          'numero',
          'numerodetelefone',
        ].includes(coluna)
      )

      if (indiceNome === -1 || indiceTelefone === -1) {
        throw new Error(
          'A primeira linha precisa ter as colunas Nome e Telefone.'
        )
      }

      const unicos = new Set<string>()
      const validos: ContatoImportado[] = []
      let errosEncontrados = 0
      let repetidos = 0

      for (const linha of linhas.slice(1)) {
        const nome = String(linha[indiceNome] ?? '').trim()
        const telefone = String(
          linha[indiceTelefone] ?? ''
        ).replace(/\D/g, '')

        if (
          nome.length < 2 ||
          !/^[1-9]\d{9,14}$/.test(telefone)
        ) {
          errosEncontrados++
          continue
        }

        if (unicos.has(telefone)) {
          repetidos++
          continue
        }

        unicos.add(telefone)
        validos.push({
          name: nome,
          phone: telefone,
        })
      }

      setContatos(validos)
      setInvalidos(errosEncontrados)
      setDuplicados(repetidos)

      if (validos.length === 0) {
        setErro('Nenhum contato válido encontrado.')
      }
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Erro ao ler o arquivo.'
      )
    } finally {
      setLendo(false)
      evento.target.value = ''
    }
  }

  async function importar() {
    if (contatos.length === 0 || importando) return

    setImportando(true)
    setErro('')
    setMensagem('')

    let inseridos = 0

    try {
      for (let i = 0; i < contatos.length; i += 100) {
        const lote = contatos.slice(i, i + 100).map((contato) => ({
          workspace_id: workspaceId,
          name: contato.name,
          phone: contato.phone,
          source: 'planilha',
          opted_in: false,
        }))

        const { data, error } = await supabase
          .from('contacts')
          .upsert(lote, {
            onConflict: 'workspace_id,phone',
            ignoreDuplicates: true,
          })
          .select('id')

        if (error) throw error
        inseridos += data?.length ?? 0
      }

      setMensagem(
        `${inseridos} contato(s) novo(s) importado(s). ` +
        `${contatos.length - inseridos} já existia(m) no banco.`
      )

      setContatos([])
      onImportado()
    } catch (e) {
      setErro(
        'Erro na importação: ' +
        (e instanceof Error ? e.message : 'Erro desconhecido') +
        '. Alguns lotes podem ter sido salvos. ' +
        'Você pode tentar novamente sem duplicar contatos.'
      )
    } finally {
      setImportando(false)
    }
  }

  return (
    <section className="verdinho-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileSpreadsheet size={23} color="#198754" />
        <h2 style={{ margin: 0 }}>Importar contatos</h2>
      </div>

      <p style={{ color: '#718579', fontSize: 14 }}>
        Importe arquivos Excel (.xlsx) ou CSV com as colunas
        Nome e Telefone.
      </p>

      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={selecionarArquivo}
        disabled={lendo || importando}
        style={{ marginTop: 12, maxWidth: '100%' }}
        aria-label="Selecionar planilha de contatos"
      />

      {lendo && <p>Processando planilha...</p>}

      {contatos.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Prévia da importação</h3>

          <p>
            Válidos: {contatos.length} |
            Inválidos: {invalidos} |
            Repetidos na planilha: {duplicados}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}>
              <thead>
                <tr>
                  <th style={{ padding: 10 }}>Nome</th>
                  <th style={{ padding: 10 }}>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {contatos.slice(0, 10).map((contato) => (
                  <tr key={contato.phone}>
                    <td style={{ padding: 10 }}>{contato.name}</td>
                    <td style={{ padding: 10 }}>{contato.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ color: '#718579', fontSize: 12 }}>
            Mostrando até 10 contatos na prévia.
            Os números não são verificados no WhatsApp.
            Todos serão importados sem autorização de envio registrada.
          </p>

          <button
            type="button"
            onClick={importar}
            disabled={importando}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: '#198754',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              cursor: 'pointer',
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            <Upload size={18} />
            {importando
              ? 'Importando...'
              : `Importar ${contatos.length} contatos`}
          </button>
        </div>
      )}

      {erro && (
        <p role="alert" style={{ color: '#c62828' }}>{erro}</p>
      )}

      {mensagem && (
        <p role="status" style={{ color: '#198754' }}>
          {mensagem}
        </p>
      )}
    </section>
  )
}
