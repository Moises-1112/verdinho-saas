
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Send,
  CalendarClock,
  MessageCircle,
  Settings,
  LogOut,
  Leaf,
  Menu,
  X,
  Inbox,
  ShieldCheck,
  ListChecks,
} from 'lucide-react'
import './Dashboard.css'
import Contatos from './Contatos'
import Listas from './Listas'
import Campanhas from './Campanhas'
import Agendamentos from './Agendamentos'

type Pagina =
  | 'dashboard'
  | 'contatos'
  | 'listas'
  | 'campanhas'
  | 'agendamentos'
  | 'whatsapp'
  | 'configuracoes'

type Props = {
  email: string
  workspaceId: string
  onSignOut: () => Promise<void>    
}
const paginas = [
  { id: 'dashboard', nome: 'Dashboard', icone: LayoutDashboard },
  { id: 'contatos', nome: 'Contatos', icone: Users },
  { id: 'listas', nome: 'Listas', icone: ListChecks },
  { id: 'campanhas', nome: 'Campanhas', icone: Send },
  { id: 'agendamentos', nome: 'Agendamentos', icone: CalendarClock },
  { id: 'whatsapp', nome: 'WhatsApp', icone: MessageCircle },
  { id: 'configuracoes', nome: 'Configurações', icone: Settings },
] as const

export default function Dashboard({ email, workspaceId, onSignOut }: Props) {
  const [pagina, setPagina] = useState<Pagina>('dashboard')
  const [menuAberto, setMenuAberto] = useState(false)

  const titulo = paginas.find((p) => p.id === pagina)?.nome

  function navegar(destino: Pagina) {
    setPagina(destino)
    setMenuAberto(false)
  }

  return (
    <div className="verdinho-app">
      {menuAberto && (
        <button
          className="verdinho-overlay"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside className={`verdinho-sidebar ${menuAberto ? 'aberto' : ''}`}>
        <div className="verdinho-logo">
          <div className="verdinho-logo-icon">
            <Leaf size={24} />
          </div>
          <div>
            <strong>verdinho</strong>
            <small>Workspace</small>
          </div>
          <button
            className="verdinho-fechar"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="verdinho-menu-label">MENU PRINCIPAL</div>

        <nav className="verdinho-nav" aria-label="Menu principal">
          {paginas.map(({ id, nome, icone: Icone }) => (
            <button
              key={id}
              className={`verdinho-nav-item ${pagina === id ? 'ativo' : ''}`}
              onClick={() => navegar(id)}
              aria-current={pagina === id ? 'page' : undefined}
            >
              <Icone size={19} />
              <span>{nome}</span>
            </button>
          ))}
        </nav>

        <div className="verdinho-sidebar-bottom">
          <div className="verdinho-user">
            <div className="verdinho-avatar">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="verdinho-user-info">
              <strong>Minha conta</strong>
              <small title={email}>{email}</small>
            </div>
          </div>

          <button className="verdinho-sair" onClick={onSignOut}>
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      <main className="verdinho-main">
        <header className="verdinho-topbar">
          <button
            className="verdinho-menu-mobile"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
          >
            <Menu size={23} />
          </button>

          <span>Painel de controle</span>

          <div className="verdinho-status">
            <span className="verdinho-status-ponto" />
            Sistema online
          </div>
        </header>

        <div className="verdinho-content">
          <div className="verdinho-heading">
            <div>
              <p className="verdinho-eyebrow">VERDINHO SAAS</p>
              <h1>{titulo}</h1>
              <p>Gerencie seu ambiente em um só lugar.</p>
            </div>
          </div>

          {pagina === 'dashboard' ? (
            <>
              <section className="verdinho-stats">
                {[
                  { nome: 'Total de contatos', valor: '0', icone: Users },
                  { nome: 'Campanhas', valor: '0', icone: Send },
                  { nome: 'Mensagens enviadas', valor: '0', icone: MessageCircle },
                  { nome: 'Agendamentos', valor: '0', icone: CalendarClock },
                ].map(({ nome, valor, icone: Icone }) => (
                  <div className="verdinho-stat-card" key={nome}>
                    <div className="verdinho-stat-top">
                      <span>{nome}</span>
                      <Icone size={20} />
                    </div>
                    <strong>{valor}</strong>
                    <small>Sem dados registrados</small>
                  </div>
                ))}
              </section>

              <section className="verdinho-widgets">
                <div className="verdinho-panel">
                  <h2>Atividade recente</h2>
                  <div className="verdinho-empty">
                    <Inbox size={34} />
                    <strong>Nenhuma atividade ainda</strong>
                    <p>Suas campanhas aparecerão aqui.</p>
                  </div>
                </div>

                <div className="verdinho-panel">
                  <h2>Conexão WhatsApp</h2>
                  <div className="verdinho-connection">
                    <MessageCircle size={29} />
                    <strong>Não conectado</strong>
                    <p>A integração com a API oficial será configurada em breve.</p>
                    <button onClick={() => navegar('whatsapp')}>
                      Ver integração
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : pagina === 'contatos' ? (
  <Contatos workspaceId={workspaceId} />
) : pagina === 'listas' ? (
  <Listas workspaceId={workspaceId} />
) : pagina === 'campanhas' ? (
  <Campanhas workspaceId={workspaceId} />
) : pagina === 'agendamentos' ? (
  <Agendamentos workspaceId={workspaceId} />
) : (
  <section className="verdinho-panel verdinho-placeholder">
              <ShieldCheck size={36} />
              <h2>{titulo}</h2>
              <p>
                Esta funcionalidade será desenvolvida nas próximas etapas.
              </p>
              <button onClick={() => navegar('dashboard')}>
                Voltar ao Dashboard
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
