import { useNavigate, useLocation } from "react-router-dom"
import {
  CalendarDays,
  ChartColumn,
  DollarSign,
  FileText,
  HandHeart,
  LayoutDashboard,
  Package,
  BadgeDollarSign,
  Menu,
  MessageCircle,
  PanelLeftClose,
  ShoppingCart,
  Users
} from "lucide-react"
import { podeAcessar } from "../utils/permissoes"
import BrandLogo from "./BrandLogo"

export default function Sidebar({ aberta = true, setAberta, tema = "escuro", mobile = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const modoEscuro = tema === "escuro"

  const isActive = (path) => location.pathname === path

  const irPara = (path) => {
    navigate(path)

    if (mobile) {
      setAberta(false)
    }
  }

  const getNavButtonClass = (path) => {
    const baseClass =
      "w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm flex items-center gap-3"

    return isActive(path)
      ? `${baseClass} bg-[#3E7996] text-white font-semibold shadow-sm`
      : modoEscuro
      ? `${baseClass} text-white/85 hover:bg-white/10 hover:text-white`
      : `${baseClass} text-[#2D2E47]/80 hover:bg-white hover:text-[#2D2E47]`
  }

  const asideClass = modoEscuro
    ? "bg-[#0F1115] text-white"
    : "bg-[#F4F6F9] text-[#2D2E47] border-r border-[#E8ECF1]"

  const headerBorderClass = modoEscuro ? "border-white/10" : "border-[#E8ECF1]"
  const dividerClass = modoEscuro ? "border-white/10" : "border-[#E8ECF1]"
  const secaoClass = modoEscuro ? "text-white/40" : "text-[#2D2E47]/45"
  const botaoClass = modoEscuro
    ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
    : "bg-white hover:bg-white text-[#2D2E47]/60 hover:text-[#2D2E47] border border-[#E8ECF1] shadow-sm"

  if (!aberta) {
    return (
      <aside className={`hidden md:flex fixed left-0 top-0 w-14 h-screen ${asideClass} flex-col items-center py-4 z-40`}>
        <button
          type="button"
          onClick={() => setAberta(true)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${botaoClass}`}
          title="Abrir menu"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="mt-6">
          <BrandLogo variant="icon" className="h-9 w-9" />
        </div>
      </aside>
    )
  }

  return (
    <aside className={`fixed left-0 top-0 h-dvh w-[min(18rem,calc(100vw-2rem))] md:w-64 ${asideClass} flex flex-col overflow-y-auto z-50 md:z-40 transition-all duration-300`}>
      <div className={`p-5 border-b ${headerBorderClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <BrandLogo tone={modoEscuro ? "light" : "dark"} className="h-10 w-40 object-left" />


          </div>

          <button
            type="button"
            onClick={() => setAberta(false)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${botaoClass}`}
            title="Recolher menu"
            aria-label={mobile ? "Fechar menu" : "Recolher menu"}
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">

        {podeAcessar("dashboard") && (
        <button
          type="button"
          onClick={() => irPara("/dashboard")}
          className={getNavButtonClass("/dashboard")}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </button>
        )}

        {podeAcessar("clientes") && (
        <button
          type="button"
          onClick={() => irPara("/clientes")}
          className={getNavButtonClass("/clientes")}
        >
            <Users className="h-4 w-4" />
          Clientes
        </button>
        )}

        {podeAcessar("servicos") && (
        <button
          type="button"
          onClick={() => irPara("/servicos")}
          className={getNavButtonClass("/servicos")}
        >
          <HandHeart className="h-4 w-4" />
          <span>Serviços</span>
        </button>
        )}

        {podeAcessar("produtos") && (
        <button
          type="button"
          onClick={() => irPara("/produtos")}
          className={getNavButtonClass("/produtos")}
        >
          <Package className="h-4 w-4" />
          <span>Produtos</span>
        </button>
        )}

        {podeAcessar("vendas") && (
        <button
          type="button"
          onClick={() => irPara("/vendas")}
          className={getNavButtonClass("/vendas")}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Vendas</span>
        </button>
        )}

        {podeAcessar("contasReceber") && (
        <button
          type="button"
          onClick={() => irPara("/contas-receber")}
          className={getNavButtonClass("/contas-receber")}
        >
          <BadgeDollarSign className="h-4 w-4" />
          <span>Contas a Receber</span>
        </button>
        )}

        {podeAcessar("agendamentos") && (
          <button
            type="button"
            onClick={() => irPara("/agendamentos")}
            className={getNavButtonClass("/agendamentos")}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Agendamentos</span>
          </button>
        )}

        {(podeAcessar("financeiro") || podeAcessar("relatorios")) && (
          <div className={`pt-3 mt-3 border-t ${dividerClass}`}>
          <p className={`px-4 text-[11px] uppercase tracking-wide mb-2 ${secaoClass}`}>
             Administração
          </p>

          <div className="space-y-2">

          {podeAcessar("financeiro") && (
            <button
              type="button"
              onClick={() => irPara("/transacoes")}
              className={getNavButtonClass("/transacoes")}
            >
                <DollarSign className="h-4 w-4" />
                <span>Financeiro</span>
              </button>
          )}

          {podeAcessar("relatorios") && (
              <button
                type="button"
                onClick={() => irPara("/financeiro/dashboard")}
                className={getNavButtonClass("/financeiro/dashboard")}
              >
                <ChartColumn className="h-4 w-4" />
                <span>Dashboard Financeiro</span>
              </button>
          )}

          {podeAcessar("relatorios") && (
              <button
                type="button"
                onClick={() => irPara("/relatorios/financeiro")}
                className={getNavButtonClass("/relatorios/financeiro")}
              >
                <FileText className="h-4 w-4" />
                <span>Relatórios</span>
              </button>
          )}
            </div>
          </div>
        )}

        {JSON.parse(localStorage.getItem("usuario") || "null")?.role === "admin" && (
          <div className={`pt-3 mt-3 border-t ${dividerClass}`}>
            <p className={`px-4 text-[11px] uppercase tracking-wide mb-2 ${secaoClass}`}>
              Configurações
            </p>

            <button
              type="button"
              onClick={() => irPara("/whatsapp")}
              className={getNavButtonClass("/whatsapp")}
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  )
}
