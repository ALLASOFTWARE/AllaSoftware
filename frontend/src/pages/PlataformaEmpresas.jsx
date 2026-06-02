import { useEffect, useMemo, useState } from "react"
import api from "../services/api"
import CampoInput from "../components/CampoInput"
import CampoSelect from "../components/CampoSelect"
import Modal from "../components/Modal"
import ModalAviso from "../components/ModalAviso"
import BrandLogo from "../components/BrandLogo"

const planos = [
  { value: "start", label: "Start - 2 usuários", limite: 2 },
  { value: "plus", label: "Plus - 5 usuários", limite: 5 },
  { value: "pro", label: "Pro - 10 usuários", limite: 10 },
  { value: "business", label: "Business - personalizado", limite: 999 }
]

const statusAssinatura = [
  { value: "ativa", label: "Ativa" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "teste", label: "Teste" }
]

const formInicial = {
  nomeEmpresa: "",
  nomeAdmin: "",
  email: "",
  senha: "",
  plano: "start",
  statusAssinatura: "ativa",
  limiteFuncionarios: 2,
  dataVencimentoPlano: ""
}

export default function PlataformaEmpresas() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")
  const [empresas, setEmpresas] = useState([])
  const [busca, setBusca] = useState("")
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState(null)
  const [form, setForm] = useState(formInicial)
  const [resetSenha, setResetSenha] = useState({ empresa: null, senha: "" })

  useEffect(() => {
    carregarEmpresas()
  }, [])

  const carregarEmpresas = async () => {
    try {
      setLoading(true)
      const res = await api.get("/plataforma/empresas")
      setEmpresas(res.data || [])
    } catch (error) {
      console.error("Erro ao carregar empresas:", error)
      setAviso({ titulo: "Erro", mensagem: "Erro ao carregar empresas da plataforma" })
    } finally {
      setLoading(false)
    }
  }

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return empresas
    return empresas.filter((empresa) =>
      [empresa.nome, empresa.email, empresa.admin?.nome, empresa.admin?.email]
        .filter(Boolean)
        .some((valor) => valor.toLowerCase().includes(termo))
    )
  }, [empresas, busca])

  const abrirNovaEmpresa = () => {
    setEmpresaEditando(null)
    setForm(formInicial)
    setMostrarModal(true)
  }

  const abrirEdicao = (empresa) => {
    setEmpresaEditando(empresa)
    setForm({
      nomeEmpresa: empresa.nome,
      nomeAdmin: empresa.admin?.nome || "",
      email: empresa.email,
      senha: "",
      plano: empresa.plano || "start",
      statusAssinatura: empresa.statusAssinatura || "ativa",
      limiteFuncionarios: empresa.limiteFuncionarios || 2,
      dataVencimentoPlano: empresa.dataVencimentoPlano
        ? empresa.dataVencimentoPlano.slice(0, 10)
        : ""
    })
    setMostrarModal(true)
  }

  const alterarPlano = (plano) => {
    const planoSelecionado = planos.find((item) => item.value === plano)
    setForm({
      ...form,
      plano,
      limiteFuncionarios: planoSelecionado?.limite || form.limiteFuncionarios
    })
  }

  const salvarEmpresa = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)

      if (empresaEditando) {
        await api.put(`/plataforma/empresas/${empresaEditando.id}`, {
          nome: form.nomeEmpresa,
          plano: form.plano,
          statusAssinatura: form.statusAssinatura,
          limiteFuncionarios: Number(form.limiteFuncionarios),
          dataVencimentoPlano: form.dataVencimentoPlano || null
        })
      } else {
        await api.post("/plataforma/empresas", {
          nomeEmpresa: form.nomeEmpresa,
          nomeAdmin: form.nomeAdmin,
          email: form.email,
          senha: form.senha,
          plano: form.plano,
          statusAssinatura: form.statusAssinatura,
          limiteFuncionarios: Number(form.limiteFuncionarios),
          dataVencimentoPlano: form.dataVencimentoPlano || null
        })
      }

      setMostrarModal(false)
      setForm(formInicial)
      setEmpresaEditando(null)
      carregarEmpresas()
    } catch (error) {
      console.error("Erro ao salvar empresa:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao salvar empresa" })
    } finally {
      setSalvando(false)
    }
  }

  const salvarResetSenha = async (e) => {
    e.preventDefault()

    try {
      await api.post(`/plataforma/empresas/${resetSenha.empresa.id}/resetar-senha`, {
        senha: resetSenha.senha
      })
      setResetSenha({ empresa: null, senha: "" })
      setAviso({ titulo: "Sucesso", mensagem: "Senha do admin atualizada com sucesso." })
    } catch (error) {
      console.error("Erro ao resetar senha:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao resetar senha" })
    }
  }

  const sair = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    window.location.href = "/plataforma/login"
  }

  const resumo = {
    total: empresas.length,
    ativas: empresas.filter((empresa) => empresa.statusAssinatura === "ativa").length,
    bloqueadas: empresas.filter((empresa) => empresa.statusAssinatura === "bloqueada").length,
    usuariosAtivos: empresas.reduce((total, empresa) => total + Number(empresa.usuariosAtivos || 0), 0)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <header className="bg-[#0F1115] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <BrandLogo tone="light" className="h-10 w-40 object-left" />
            <div className="hidden border-l border-white/20 pl-4 sm:block">
              <p className="text-sm text-white/60">Painel da Plataforma</p>
              <p className="font-semibold">{usuario?.nome}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={sair}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Empresas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Crie empresas, defina planos e controle limites de usuários ativos.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovaEmpresa}
            className="rounded-xl bg-[#2F8AA3] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90"
          >
            + Nova empresa
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Resumo label="Empresas" value={resumo.total} />
          <Resumo label="Ativas" value={resumo.ativas} />
          <Resumo label="Bloqueadas" value={resumo.bloqueadas} />
          <Resumo label="Usuários ativos" value={resumo.usuariosAtivos} />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar empresa, email ou admin"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#3E7996]"
            />
          </div>

          {loading ? (
            <div className="p-6 text-gray-500">Carregando empresas...</div>
          ) : empresasFiltradas.length === 0 ? (
            <div className="p-6 text-gray-500">Nenhuma empresa encontrada.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {empresasFiltradas.map((empresa) => (
                <div key={empresa.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold text-[#2D2E47]">{empresa.nome}</p>
                    <p className="text-sm text-gray-500">{empresa.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Admin: {empresa.admin?.nome || "Não definido"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Plano</p>
                    <p className="text-sm font-medium text-[#2D2E47]">
                      {empresa.plano} · {empresa.statusAssinatura}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Usuários ativos</p>
                    <p className="text-sm font-medium text-[#2D2E47]">
                      {empresa.usuariosAtivos}/{empresa.limiteFuncionarios}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(empresa)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetSenha({ empresa, senha: "" })}
                      className="rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                    >
                      Resetar senha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {mostrarModal && (
        <Modal onClose={() => setMostrarModal(false)} titulo={empresaEditando ? "Editar empresa" : "Nova empresa"}>
          <form onSubmit={salvarEmpresa} className="space-y-4">
            <CampoInput
              label="Nome da empresa *"
              value={form.nomeEmpresa}
              onChange={(e) => setForm({ ...form, nomeEmpresa: e.target.value })}
              required
            />

            {!empresaEditando && (
              <>
                <CampoInput
                  label="Nome do admin *"
                  value={form.nomeAdmin}
                  onChange={(e) => setForm({ ...form, nomeAdmin: e.target.value })}
                  required
                />
                <CampoInput
                  label="Email do admin *"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <CampoInput
                  label="Senha inicial *"
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  required
                />
              </>
            )}

            <CampoSelect
              label="Plano"
              value={form.plano}
              onChange={(e) => alterarPlano(e.target.value)}
              options={planos.map(({ value, label }) => ({ value, label }))}
            />

            <CampoInput
              label="Limite de usuários ativos"
              type="number"
              min="1"
              value={form.limiteFuncionarios}
              onChange={(e) => setForm({ ...form, limiteFuncionarios: e.target.value })}
            />

            <CampoSelect
              label="Status da assinatura"
              value={form.statusAssinatura}
              onChange={(e) => setForm({ ...form, statusAssinatura: e.target.value })}
              options={statusAssinatura}
            />

            <CampoInput
              label="Vencimento do plano"
              type="date"
              value={form.dataVencimentoPlano}
              onChange={(e) => setForm({ ...form, dataVencimentoPlano: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-[#2F8AA3] px-5 py-2.5 text-white hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetSenha.empresa && (
        <Modal onClose={() => setResetSenha({ empresa: null, senha: "" })} titulo="Resetar senha do admin">
          <form onSubmit={salvarResetSenha} className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Empresa</p>
              <p className="font-medium text-[#2D2E47]">{resetSenha.empresa.nome}</p>
              <p className="text-sm text-gray-500 mt-2">Admin</p>
              <p className="font-medium text-[#2D2E47]">{resetSenha.empresa.admin?.email}</p>
            </div>

            <CampoInput
              label="Nova senha *"
              type="password"
              value={resetSenha.senha}
              onChange={(e) => setResetSenha({ ...resetSenha, senha: e.target.value })}
              required
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetSenha({ empresa: null, senha: "" })}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#2F8AA3] px-5 py-2.5 text-white hover:opacity-90"
              >
                Atualizar senha
              </button>
            </div>
          </form>
        </Modal>
      )}

      {aviso && <ModalAviso {...aviso} onClose={() => setAviso(null)} />}
    </div>
  )
}

function Resumo({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#2D2E47]">{value}</p>
    </div>
  )
}
