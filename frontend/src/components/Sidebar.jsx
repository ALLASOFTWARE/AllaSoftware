import { useNavigate, useLocation } from "react-router-dom"
import { podeAcessar } from "../utils/permissoes"

export default function Sidebar({ aberta = true, setAberta }) {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = JSON.parse(localStorage.getItem("usuario"))

  const isActive = (path) => location.pathname === path

  const getNavButtonClass = (path) => {
    const baseClass =
      "w-full text-left px-4 py-2.5 rounded-xl transition-colors text-sm"

    return isActive(path)
      ? `${baseClass} bg-[#3E7996] text-white font-semibold shadow-sm`
      : `${baseClass} text-white/85 hover:bg-white/10 hover:text-white`
  }

  if (!aberta) {
    return (
      <aside className="fixed left-0 top-0 w-14 h-screen bg-[#2D2E47] text-white flex flex-col items-center py-4 z-40">
        <button
          type="button"
          onClick={() => setAberta(true)}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          title="Abrir menu"
        >
          ☰
        </button>

        <div className="mt-6 text-[10px] font-bold text-white/40 rotate-90 whitespace-nowrap">
          ALLA
        </div>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-[#2D2E47] text-white flex flex-col overflow-y-auto z-40 transition-all duration-300">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">
              Sistema ALLA
            </h1>

            <p className="text-xs text-white/45 mt-1">
              Gestão inteligente
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAberta(false)}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
            title="Recolher menu"
          >
            ‹
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">

        {podeAcessar("dashboard") && (
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className={getNavButtonClass("/dashboard")}
        >
          Dashboard
        </button>
        )}

        {podeAcessar("clientes") && (
        <button
          type="button"
          onClick={() => navigate("/clientes")}
          className={getNavButtonClass("/clientes")}
        >
          Clientes
        </button>
        )}

        {podeAcessar("servicos") && (
        <button
          type="button"
          onClick={() => navigate("/servicos")}
          className={getNavButtonClass("/servicos")}
        >
          Serviços
        </button>
        )}

        {podeAcessar("produtos") && (
        <button
          type="button"
          onClick={() => navigate("/produtos")}
          className={getNavButtonClass("/produtos")}
        >
          Produtos
        </button>
        )}

        {podeAcessar("vendas") && (
        <button
          type="button"
          onClick={() => navigate("/vendas")}
          className={getNavButtonClass("/vendas")}
        >
          Vendas
        </button>
        )}

        {podeAcessar("contas-receber") && (
        <button
          type="button"
          onClick={() => navigate("/contas-receber")}
          className={getNavButtonClass("/contas-receber")}
        >
          Contas a Receber
        </button>
        )}

        {podeAcessar("agendamentos") && (
          <button
            type="button"
            onClick={() => navigate("/agendamentos")}
            className={getNavButtonClass("/agendamentos")}
          >
            Agendamentos
          </button>
        )}

        {usuario?.role === "admin" && (
          <div className="pt-3 mt-3 border-t border-white/10">
          <p className="px-4 text-[11px] uppercase tracking-wide text-white/40 mb-2">
             Administração
          </p>

          <div className="space-y-2">

          {podeAcessar("financeiro") && (
            <button
              type="button"
              onClick={() => navigate("/transacoes")}
              className={getNavButtonClass("/transacoes")}
            >
                Financeiro
              </button>
          )}

          {podeAcessar("relatorios") && (
              <button
                type="button"
                onClick={() => navigate("/financeiro/dashboard")}
                className={getNavButtonClass("/financeiro/dashboard")}
              >
                Dashboard Financeiro
              </button>
          )}

          {podeAcessar("equipe") && (
            <button
              type="button"
              onClick={() => navigate("/equipe")}
              className={getNavButtonClass("/equipe")}
            >
                Equipe
              </button>
          )}

          {podeAcessar("relatorios") && (
              <button
                type="button"
                onClick={() => navigate("/relatorios/financeiro")}
                className={getNavButtonClass("/relatorios/financeiro")}
              >
                Relatórios
              </button>
          )}
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}