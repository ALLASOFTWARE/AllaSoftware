import { useEffect, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import CampoInput from "../components/CampoInput"
import ModalAviso from "../components/ModalAviso"

const permissoesPadraoFuncionario = {
  dashboard: { visualizar: true },
  clientes: { visualizar: true, criar: true, editar: true, excluir: false },
  servicos: { visualizar: true, criar: false, editar: false, excluir: false },
  produtos: { visualizar: true, criar: false, editar: false, excluir: false },
  vendas: { visualizar: true, criar: true, editar: false, excluir: false },
  contasReceber: {
    visualizar: true,
    criar: false,
    receberPagamento: true,
    editar: false,
    excluir: false
  },
  agendamentos: { visualizar: true, criar: true, editar: true, excluir: false },
  financeiro: { visualizar: false, criar: false, editar: false, excluir: false },
  relatorios: { visualizar: false },
  usuarios: { visualizar: false, criar: false, editar: false, excluir: false }
}

const permissoesAdmin = {
  dashboard: { visualizar: true },
  clientes: { visualizar: true, criar: true, editar: true, excluir: true },
  servicos: { visualizar: true, criar: true, editar: true, excluir: true },
  produtos: { visualizar: true, criar: true, editar: true, excluir: true },
  vendas: { visualizar: true, criar: true, editar: true, excluir: true },
  contasReceber: {
    visualizar: true,
    criar: true,
    receberPagamento: true,
    editar: true,
    excluir: true
  },
  agendamentos: { visualizar: true, criar: true, editar: true, excluir: true },
  financeiro: { visualizar: true, criar: true, editar: true, excluir: true },
  relatorios: { visualizar: true },
  usuarios: { visualizar: true, criar: true, editar: true, excluir: true }
}

const modulosPermissao = [
  { key: "dashboard", label: "Dashboard", acoes: ["visualizar"] },
  { key: "clientes", label: "Clientes", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { key: "servicos", label: "Serviços", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { key: "produtos", label: "Produtos", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { key: "vendas", label: "Vendas", acoes: ["visualizar", "criar", "editar", "excluir"] },
  {
    key: "contasReceber",
    label: "Contas a Receber",
    acoes: ["visualizar", "criar", "receberPagamento", "editar", "excluir"]
  },
  { key: "agendamentos", label: "Agendamentos", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { key: "financeiro", label: "Financeiro", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { key: "relatorios", label: "Relatórios", acoes: ["visualizar"] },
  { key: "usuarios", label: "Equipe", acoes: ["visualizar", "criar", "editar", "excluir"] }
]

const labelsAcoes = {
  visualizar: "Visualizar",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
  receberPagamento: "Receber pagamento"
}

export default function Equipe() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuario"))

  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [usuarioEditandoId, setUsuarioEditandoId] = useState(null)

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "funcionario",
    cargo: "",
    status: "ativo",
    permissoes: permissoesPadraoFuncionario
  })

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      const res = await api.get("/usuarios")
      setUsuarios(res.data || [])
    } catch (error) {
      console.error("Erro ao carregar equipe:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao carregar equipe"
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirNovo = () => {
    setModoEdicao(false)
    setUsuarioEditandoId(null)

    setForm({
      nome: "",
      email: "",
      senha: "",
      role: "funcionario",
      cargo: "",
      status: "ativo",
      permissoes: permissoesPadraoFuncionario
    })

    setMostrarModal(true)
  }

  const abrirEdicao = (usuario) => {
    setModoEdicao(true)
    setUsuarioEditandoId(usuario.id)

    setForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      senha: "",
      role: usuario.role || "funcionario",
      cargo: usuario.cargo || "",
      status: usuario.status || "ativo",
      permissoes:
        usuario.permissoes ||
        (usuario.role === "admin" ? permissoesAdmin : permissoesPadraoFuncionario)
    })

    setMostrarModal(true)
  }

  const salvarUsuario = async (e) => {
    e.preventDefault()

    if (!form.nome.trim() || !form.email.trim()) {
      setAviso({
        titulo: "Atenção",
        mensagem: "Informe nome e email."
      })
      return
    }

    if (!modoEdicao && !form.senha) {
      setAviso({
        titulo: "Atenção",
        mensagem: "Informe uma senha para criar o usuário."
      })
      return
    }

    try {
      setSalvando(true)

      const payload = {
        nome: form.nome,
        email: form.email,
        role: form.role,
        cargo: form.cargo || null,
        status: form.status,
        permissoes: form.role === "admin" ? permissoesAdmin : form.permissoes
      }

      if (form.senha) {
        payload.senha = form.senha
      }

      if (modoEdicao) {
        await api.put(`/usuarios/${usuarioEditandoId}`, payload)
      } else {
        await api.post("/usuarios", payload)
      }

      setMostrarModal(false)
      await carregarUsuarios()

      setAviso({
        titulo: "Sucesso",
        mensagem: modoEdicao
          ? "Usuário atualizado com sucesso!"
          : "Usuário criado com sucesso!"
      })
    } catch (error) {
      console.error("Erro ao salvar usuário:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao salvar usuário"
      })
    } finally {
      setSalvando(false)
    }
  }

  const alternarStatus = async (usuario) => {
    const novoStatus = usuario.status === "ativo" ? "inativo" : "ativo"

    try {
      await api.patch(`/usuarios/${usuario.id}/status`, {
        status: novoStatus
      })

      await carregarUsuarios()
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao alterar status"
      })
    }
  }

  const excluirUsuario = async (usuario) => {
    const confirmar = window.confirm(
      `Deseja realmente excluir ${usuario.nome}? Essa ação não poderá ser desfeita.`
    )

    if (!confirmar) return

    try {
      await api.delete(`/usuarios/${usuario.id}`)
      await carregarUsuarios()

      setAviso({
        titulo: "Sucesso",
        mensagem: "Usuário removido com sucesso!"
      })
    } catch (error) {
      console.error("Erro ao excluir usuário:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao excluir usuário"
      })
    }
  }

  const alterarRole = (role) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissoes: role === "admin" ? permissoesAdmin : permissoesPadraoFuncionario
    }))
  }

  const alterarPermissao = (modulo, acao) => {
    setForm((prev) => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: {
          ...(prev.permissoes?.[modulo] || {}),
          [acao]: !prev.permissoes?.[modulo]?.[acao]
        }
      }
    }))
  }

  const usuariosAtivos = usuarios.filter((u) => u.status === "ativo").length
  const usuariosInativos = usuarios.filter((u) => u.status === "inativo").length
  const admins = usuarios.filter((u) => u.role === "admin").length

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Equipe
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Gerencie usuários, cargos, status e permissões da empresa.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovo}
            className="bg-[#2F8AA3] text-white px-5 py-2.5 rounded-xl hover:opacity-90 text-sm font-medium"
          >
            + Novo usuário
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ResumoCard titulo="Total" valor={usuarios.length} />
          <ResumoCard titulo="Ativos" valor={usuariosAtivos} />
          <ResumoCard titulo="Inativos" valor={usuariosInativos} />
          <ResumoCard titulo="Admins" valor={admins} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {loading ? (
            <p className="text-gray-500">Carregando equipe...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-gray-500">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {usuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[#2F8AA3]/10 text-[#2F8AA3] flex items-center justify-center font-bold shrink-0">
                        {(usuario.nome || "U").charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-[#2D2E47] truncate">
                          {usuario.nome}
                        </h3>

                        <p className="text-sm text-gray-500 truncate">
                          {usuario.email}
                        </p>

                        <p className="text-sm text-gray-400 mt-1">
                          {usuario.cargo || "Sem cargo informado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={usuario.status} />
                      <RoleBadge role={usuario.role} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-5">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(usuario)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => alternarStatus(usuario)}
                      className={`px-4 py-2 rounded-xl border text-sm ${
                        usuario.status === "ativo"
                          ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {usuario.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>

                    {Number(usuario.id) !== Number(usuarioLogado?.id) && (
                      <button
                        type="button"
                        onClick={() => excluirUsuario(usuario)}
                        className="px-4 py-2 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mostrarModal && (
        <Modal
          titulo={modoEdicao ? "Editar usuário" : "Novo usuário"}
          onClose={() => setMostrarModal(false)}
          largura="max-w-5xl"
        >
          <form onSubmit={salvarUsuario} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#2D2E47] mb-3">
                Informações principais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoInput
                  label="Nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do usuário"
                />

                <CampoInput
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@empresa.com"
                />

                <CampoInput
                  label={modoEdicao ? "Nova senha (opcional)" : "Senha"}
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  placeholder={modoEdicao ? "Deixe vazio para manter" : "Senha inicial"}
                />

                <CampoInput
                  label="Cargo"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Ex: Recepcionista, Atendente, Gerente"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#2D2E47] mb-3">
                Acesso
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoSelect
                  label="Perfil"
                  value={form.role}
                  onChange={(e) => alterarRole(e.target.value)}
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "funcionario", label: "Funcionário" }
                  ]}
                />

                <CampoSelect
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={[
                    { value: "ativo", label: "Ativo" },
                    { value: "inativo", label: "Inativo" }
                  ]}
                />
              </div>
            </div>

            {form.role !== "admin" && (
              <div>
                <h3 className="text-sm font-semibold text-[#2D2E47] mb-3">
                  Permissões
                </h3>

                <div className="space-y-3">
                  {modulosPermissao.map((modulo) => (
                    <div
                      key={modulo.key}
                      className="border border-gray-100 rounded-2xl p-4"
                    >
                      <p className="font-semibold text-[#2D2E47] mb-3">
                        {modulo.label}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {modulo.acoes.map((acao) => (
                          <button
                            key={`${modulo.key}-${acao}`}
                            type="button"
                            onClick={() => alterarPermissao(modulo.key, acao)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                              form.permissoes?.[modulo.key]?.[acao]
                                ? "bg-[#2F8AA3] text-white border-[#2F8AA3]"
                                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {labelsAcoes[acao] || acao}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar usuário"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {aviso && <ModalAviso {...aviso} onClose={() => setAviso(null)} />}
    </AppLayout>
  )
}

function ResumoCard({ titulo, valor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold text-[#2D2E47] mt-2">{valor}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${
        status === "ativo"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {status === "ativo" ? "Ativo" : "Inativo"}
    </span>
  )
}

function RoleBadge({ role }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${
        role === "admin"
          ? "bg-blue-100 text-blue-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {role === "admin" ? "Admin" : "Funcionário"}
    </span>
  )
}

function CampoSelect({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#2D2E47] mb-2">
        {label}
      </label>

      <select
        value={value}
        onChange={onChange}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Modal({ titulo, children, onClose, largura = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
      <div
        className={`w-full ${largura} bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-[#2D2E47]">{titulo}</h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}