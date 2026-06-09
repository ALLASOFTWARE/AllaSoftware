import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Menu, Moon, Settings, Sun } from "lucide-react"
import Sidebar from "../components/Sidebar"
import BrandLogo from "../components/BrandLogo"
import api from "../services/api"
import { podeAcessar } from "../utils/permissoes"

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false)
  const [menuAjustesAberto, setMenuAjustesAberto] = useState(false)
  const [temaSidebar, setTemaSidebar] = useState(() => {
    try {
      return localStorage.getItem("temaSidebar") || "escuro"
    } catch {
      return "escuro"
    }
  })
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario"))
    } catch {
      return null
    }
  })

  useEffect(() => {
    const atualizarUsuarioLogado = async () => {
      try {
        const res = await api.get("/perfil")

        if (res.data?.tipo === "usuario") {
          const usuarioAtualizado = {
            id: res.data.id,
            nome: res.data.nome,
            email: res.data.email,
            role: res.data.role,
            cargo: res.data.cargo,
            status: res.data.status,
            permissoes: res.data.permissoes,
            tipoEquipe: res.data.tipoEquipe,
            profissional: res.data.profissional,
            preSelecionarAgendamento: res.data.preSelecionarAgendamento,
            empresaId: res.data.empresa?.id
          }

          localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado))
          setUsuario(usuarioAtualizado)
        }
      } catch (error) {
        console.error("Erro ao atualizar usuario logado:", error)
      }
    }

    atualizarUsuarioLogado()
    window.addEventListener("focus", atualizarUsuarioLogado)

    return () => {
      window.removeEventListener("focus", atualizarUsuarioLogado)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuMobileAberto ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [menuMobileAberto])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const fecharMenuNoDesktop = (event) => {
      if (event.matches) {
        setMenuMobileAberto(false)
      }
    }

    if (mediaQuery.matches) {
      setMenuMobileAberto(false)
    }

    mediaQuery.addEventListener("change", fecharMenuNoDesktop)

    return () => {
      mediaQuery.removeEventListener("change", fecharMenuNoDesktop)
    }
  }, [])

  const nomeUsuario = usuario?.nome || "Usuário"
  const emailUsuario = usuario?.email || "Email não informado"

  const perfilUsuario =
    usuario?.role === "admin"
      ? "Administrador(a)"
      : usuario?.role === "funcionario"
      ? "Funcionário(a)"
      : "Empresa"

  const podeVerEmpresa = usuario?.role === "admin" || usuario?.tipo === "empresa"
  const inicialUsuario = nomeUsuario.charAt(0).toUpperCase()

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("usuario")
    navigate("/")
  }

  const alternarTemaSidebar = () => {
    setTemaSidebar((temaAtual) => {
      const proximoTema = temaAtual === "escuro" ? "claro" : "escuro"
      localStorage.setItem("temaSidebar", proximoTema)
      return proximoTema
    })
  }

  const irPara = (rota) => {
    setMenuPerfilAberto(false)
    setMenuAjustesAberto(false)
    navigate(rota)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <Sidebar
          aberta={sidebarAberta}
          setAberta={setSidebarAberta}
          tema={temaSidebar}
        />
      </div>

      {menuMobileAberto && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMenuMobileAberto(false)}
            aria-label="Fechar menu"
          />

          <Sidebar
            aberta={menuMobileAberto}
            setAberta={setMenuMobileAberto}
            tema={temaSidebar}
            mobile
          />
        </div>
      )}

      <div
        className={`min-h-screen transition-all duration-300 ${
          sidebarAberta ? "md:ml-64" : "md:ml-14"
        }`}
      >
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 sticky top-0 z-30">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuMobileAberto(true)}
              className="md:hidden h-10 w-10 shrink-0 rounded-xl border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#2D2E47] flex items-center justify-center transition"
              title="Abrir menu"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <BrandLogo tone="dark" className="h-8 w-28 object-left sm:h-9 sm:w-40" />
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={alternarTemaSidebar}
              className="h-10 w-10 shrink-0 rounded-xl border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:text-[#2D2E47] flex items-center justify-center transition"
              title={temaSidebar === "escuro" ? "Modo claro" : "Modo escuro"}
              aria-label={temaSidebar === "escuro" ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {temaSidebar === "escuro" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuPerfilAberto(!menuPerfilAberto)
                  setMenuAjustesAberto(false)
                }}
                className="flex items-center gap-2 sm:gap-3 px-1.5 sm:px-3 py-2 rounded-xl hover:bg-gray-50 transition"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#2D2E47] leading-tight">
                    {nomeUsuario}
                  </p>
                  <p className="text-xs text-gray-400">
                    {perfilUsuario}
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-[#2F8AA3] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {inicialUsuario || "U"}
                </div>

                <span className="text-gray-400 text-xs sm:text-sm">
                  {menuPerfilAberto ? "▲" : "▼"}
                </span>
              </button>

              {menuPerfilAberto && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="bg-[#2F8AA3] p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white text-[#2F8AA3] flex items-center justify-center text-lg font-bold shadow-sm">
                        {inicialUsuario || "U"}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {nomeUsuario}
                        </p>
                        <p className="text-xs text-white/80 truncate">
                          {perfilUsuario}
                        </p>
                      </div>
                    </div>

                    {(podeAcessar("usuarios") || podeAcessar("comissoes") || podeVerEmpresa) && (
                      <button
                        type="button"
                        onClick={() => setMenuAjustesAberto(!menuAjustesAberto)}
                        className="h-9 w-9 shrink-0 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition"
                        title="Ajustes"
                        aria-label="Ajustes"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-white/80 mt-3 truncate">
                    {emailUsuario}
                  </p>
                </div>

                <div className="p-2">
                  {menuAjustesAberto && (
                    <div className="mb-2 border-b border-gray-100 pb-2">
                      <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Ajustes
                      </p>

                      {podeAcessar("usuarios") && (
                        <button
                          type="button"
                          onClick={() => irPara("/equipe")}
                          className="w-full text-left px-4 py-3 rounded-xl text-sm text-[#2D2E47] hover:bg-gray-50 transition"
                        >
                          Equipe
                        </button>
                      )}

                      {podeAcessar("comissoes") && (
                        <button
                          type="button"
                          onClick={() => irPara("/comissoes")}
                          className="w-full text-left px-4 py-3 rounded-xl text-sm text-[#2D2E47] hover:bg-gray-50 transition"
                        >
                          Comissões
                        </button>
                      )}

                      {podeVerEmpresa && (
                        <button
                          type="button"
                          onClick={() => irPara("/empresa")}
                          className="w-full text-left px-4 py-3 rounded-xl text-sm text-[#2D2E47] hover:bg-gray-50 transition"
                        >
                          Empresa
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => irPara("/perfil")}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm text-[#2D2E47] hover:bg-gray-50 transition"
                  >
                    Minha conta
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-3"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
