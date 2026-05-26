import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import Modal from "../components/Modal"
import ResumoCard from "../components/ResumoCard"
import StatusBadge from "../components/StatusBadge"
import CampoInput from "../components/CampoInput"
import CampoTextarea from "../components/CampoTextarea"
import ModalAviso from "../components/ModalAviso"
import PaginacaoLista from "../components/PaginacaoLista"
import { podeAcessar } from "../utils/permissoes"

export default function Clientes() {
  const navigate = useNavigate()

  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState("")
  const [ordem, setOrdem] = useState("asc")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)

  const [mostrarNovoModal, setMostrarNovoModal] = useState(false)
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false)
  const [mostrarModalConfirmacao, setMostrarModalConfirmacao] = useState(false)
  const [mostrarModalSimples, setMostrarModalSimples] = useState(false)
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("")
  const [clienteParaDeletar, setClienteParaDeletar] = useState(null)
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState("")
  const [aviso, setAviso] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const podeCriar = podeAcessar("clientes", "criar")
  const podeEditar = podeAcessar("clientes", "editar")
  const podeExcluir = podeAcessar("clientes", "excluir")

  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    telefone: "",
    email: "",
    observacoes: "",
  })

  const [clienteEditando, setClienteEditando] = useState({
    id: null,
    nome: "",
    telefone: "",
    email: "",
    observacoes: "",
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginaAtual(1)
      carregarClientes()
    }, 300)

    return () => clearTimeout(timer)
  }, [busca, status, ordem])

  const carregarClientes = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()

      if (busca) params.append("busca", busca)
      if (status) params.append("status", status)
      if (ordem) params.append("ordem", ordem)

      const response = await api.get(`/clientes?${params.toString()}`)
      setClientes(response.data)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getIniciais = (nome) => {
    if (!nome) return "CL"

    const partes = nome.trim().split(" ").filter(Boolean)

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase()
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }

  const getCorAvatar = (index) => {
    const cores = [
      "bg-cyan-100 text-cyan-700",
      "bg-amber-100 text-amber-700",
      "bg-violet-100 text-violet-700",
      "bg-blue-100 text-blue-700",
      "bg-pink-100 text-pink-700",
      "bg-emerald-100 text-emerald-700",
    ]

    return cores[index % cores.length]
  }

  const abrirEditar = (cliente) => {
    setClienteEditando({
      id: cliente.id,
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      observacoes: cliente.observacoes || "",
    })
    setMostrarEditarModal(true)
  }

  const salvarNovoCliente = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      await api.post("/clientes", novoCliente)

      setNovoCliente({ nome: "", telefone: "", email: "", observacoes: "" })
      setMostrarNovoModal(false)
      carregarClientes()
    } catch (error) {
      console.error("Erro ao criar cliente:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao criar cliente" })
    } finally {
      setSalvando(false)
    }
  }

  const salvarEdicaoCliente = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      await api.put(`/clientes/${clienteEditando.id}`, {
        nome: clienteEditando.nome,
        telefone: clienteEditando.telefone,
        email: clienteEditando.email,
        observacoes: clienteEditando.observacoes,
      })

      setMostrarEditarModal(false)
      carregarClientes()
    } catch (error) {
      console.error("Erro ao editar cliente:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao editar cliente" })
    } finally {
      setSalvando(false)
    }
  }

  const excluirCliente = async (id, nome) => {
    setClienteParaDeletar({ id, nome })
    setMostrarModalSimples(true)
  }

  const confirmarExclusaoSimples = async () => {
    if (excluindo) return

    try {
      setExcluindo(true)
      await api.delete(`/clientes/${clienteParaDeletar.id}`)
      setMostrarModalSimples(false)
      setClienteParaDeletar(null)
      carregarClientes()
    } catch (error) {
      const dados = error.response?.data || {}

      if (dados.temContasPendentes) {
        setMostrarModalSimples(false)
        setMensagemConfirmacao(
          dados.mensagem || "Este cliente tem contas pendentes. Digite sua senha para confirmar a exclusão."
        )
        setMostrarModalConfirmacao(true)
      } else {
        console.error("Erro ao excluir cliente:", error)
        setAviso({ titulo: "Erro", mensagem: dados.error || "Erro ao excluir cliente" })
      }
    } finally {
      setExcluindo(false)
    }
  }

  const confirmarExclusaoComSenha = async () => {
    if (excluindo) return

    if (!senhaConfirmacao) {
      setAviso({ titulo: "Erro", mensagem: "Digite sua senha para confirmar" })
      return
    }

    try {
      setExcluindo(true)
      await api.delete(`/clientes/${clienteParaDeletar.id}`, {
        data: { senhaConfirmacao }
      })

      setMostrarModalConfirmacao(false)
      setSenhaConfirmacao("")
      setClienteParaDeletar(null)
      carregarClientes()
      setAviso({ titulo: "Sucesso", mensagem: "Cliente excluído com sucesso" })
    } catch (error) {
      console.error("Erro ao excluir cliente:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao excluir cliente" })
      setSenhaConfirmacao("")
    } finally {
      setExcluindo(false)
    }
  }

  const resumo = useMemo(() => {
    const total = clientes.length
    const emDia = clientes.filter((c) => c.status === "em_dia").length
    const pendentes = clientes.filter((c) => c.status === "pendente").length

    return { total, emDia, pendentes }
  }, [clientes])

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return clientes.slice(inicio, inicio + itensPorPagina)
  }, [clientes, paginaAtual, itensPorPagina])

  useEffect(() => {
    const totalPaginas = Math.max(1, Math.ceil(clientes.length / itensPorPagina))
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas)
    }
  }, [clientes.length, itensPorPagina, paginaAtual])

  const alterarItensPorPagina = (valor) => {
    setItensPorPagina(valor)
    setPaginaAtual(1)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Clientes
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie, pesquise e acompanhe os clientes cadastrados.
            </p>
          </div>

          {podeCriar && (
            <button
              onClick={() => setMostrarNovoModal(true)}
              className="bg-[#2F8AA3] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition shadow-sm"
            >
              + Novo Cliente
            </button>
          )}
        </div>

        {/* Busca + filtros */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="w-full xl:max-w-md">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-full pl-4 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3E7996] shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Todos", value: "" },
              { label: "Em dia", value: "em_dia" },
              { label: "Pendente", value: "pendente" },
            ].map((filtro) => (
              <button
                key={filtro.value}
                type="button"
                onClick={() => setStatus(filtro.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  status === filtro.value
                    ? "bg-[#2F8AA3] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {filtro.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setOrdem(ordem === "asc" ? "desc" : "asc")}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              {ordem === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResumoCard
            titulo="Total de Clientes"
            valor={resumo.total}
            corIcone="bg-blue-100 text-blue-600"
            icon="users"
          />
          <ResumoCard
            titulo="Clientes em dia"
            valor={resumo.emDia}
            corIcone="bg-emerald-100 text-emerald-600"
            icon="userRoundCheck"
          />
          <ResumoCard
            titulo="Clientes pendentes"
            valor={resumo.pendentes}
            corIcone="bg-amber-100 text-amber-600"
            icon="userRoundX"
          />
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-500">Carregando clientes...</div>
          ) : clientes.length === 0 ? (
            <div className="p-6 text-gray-500">Nenhum cliente encontrado.</div>
          ) : (
            <>
              {/* Tabela desktop */}
              <div className="hidden xl:block">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-500 border-b border-gray-100">
                  <div className="col-span-4">Cliente</div>
                  <div className="col-span-4">Contato</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>

                {clientesPaginados.map((cliente, index) => (
                  <div
                    key={cliente.id}
                    className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="col-span-4 flex items-center gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold shrink-0 ${getCorAvatar((paginaAtual - 1) * itensPorPagina + index)}`}
                      >
                        {getIniciais(cliente.nome)}
                      </div>

                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/clientes/${cliente.id}`)}
                          className="font-semibold text-[#2D2E47] hover:text-[#3E7996] hover:underline text-left truncate block"
                        >
                          {cliente.nome}
                        </button>
                        <p className="text-sm text-gray-500 truncate">
                          {cliente.observacoes || "Sem observações"}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-4 flex flex-col justify-center min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {cliente.telefone || "Sem telefone"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {cliente.email || "Sem email"}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <StatusBadge status={cliente.status === "em_dia" ? "pago" : cliente.status} />
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {podeEditar && (
                        <button
                          onClick={() => abrirEditar(cliente)}
                          className="text-sm px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Editar
                        </button>
                      )}

                      {podeExcluir && (
                        <button
                          onClick={() => excluirCliente(cliente.id, cliente.nome)}
                          className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cards mobile/tablet */}
              <div className="xl:hidden p-4 space-y-4">
                {clientesPaginados.map((cliente, index) => (
                  <div
                    key={cliente.id}
                    className="border border-gray-100 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold shrink-0 ${getCorAvatar((paginaAtual - 1) * itensPorPagina + index)}`}
                      >
                        {getIniciais(cliente.nome)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            onClick={() => navigate(`/clientes/${cliente.id}`)}
                            className="font-semibold text-[#2D2E47] hover:text-[#3E7996] hover:underline text-left"
                          >
                            {cliente.nome}
                          </button>

                          <StatusBadge status={cliente.status === "em_dia" ? "pago" : cliente.status} />
                        </div>

                        <p className="text-sm text-gray-700 mt-2">
                          {cliente.telefone || "Sem telefone"}
                        </p>
                        <p className="text-sm text-gray-500 break-all">
                          {cliente.email || "Sem email"}
                        </p>

                        {cliente.observacoes && (
                          <p className="text-sm text-gray-500 mt-2">
                            {cliente.observacoes}
                          </p>
                        )}

                        <div className="flex gap-2 mt-4">
                          {podeEditar && (
                            <button
                              onClick={() => abrirEditar(cliente)}
                              className="text-sm px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </button>
                          )}

                          {podeExcluir && (
                            <button
                              onClick={() => excluirCliente(cliente.id, cliente.nome)}
                              className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <PaginacaoLista
                total={clientes.length}
                pagina={paginaAtual}
                porPagina={itensPorPagina}
                onPaginaChange={setPaginaAtual}
                onPorPaginaChange={alterarItensPorPagina}
                rotulo="cliente(s)"
              />
            </>
          )}
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {mostrarNovoModal && podeCriar && (
        <Modal onClose={() => setMostrarNovoModal(false)} titulo="Novo Cliente">
          <form onSubmit={salvarNovoCliente} className="space-y-4">
            <CampoInput
              label="Nome completo *"
              value={novoCliente.nome}
              onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
              placeholder="Digite o nome completo"
              required
            />

            <CampoInput
              label="Telefone"
              value={novoCliente.telefone}
              onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
              placeholder="(11) 99999-9999"
            />

            <CampoInput
              label="Email"
              type="email"
              value={novoCliente.email}
              onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
              placeholder="exemplo@email.com"
            />

            <CampoTextarea
              label="Observações"
              value={novoCliente.observacoes}
              onChange={(e) => setNovoCliente({ ...novoCliente, observacoes: e.target.value })}
              placeholder="Anotações sobre o cliente (opcional)"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarNovoModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar Cliente"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Cliente */}
      {mostrarEditarModal && podeEditar && (
        <Modal
          onClose={() => setMostrarEditarModal(false)}
          titulo="Editar Cliente"
          largura="max-w-2xl"
        >
          <form onSubmit={salvarEdicaoCliente} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoInput
                label="Nome completo *"
                value={clienteEditando.nome}
                onChange={(e) => setClienteEditando({ ...clienteEditando, nome: e.target.value })}
                placeholder="Digite o nome completo"
                required
              />

              <CampoInput
                label="Telefone"
                value={clienteEditando.telefone}
                onChange={(e) => setClienteEditando({ ...clienteEditando, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <CampoInput
              label="Email"
              type="email"
              value={clienteEditando.email}
              onChange={(e) => setClienteEditando({ ...clienteEditando, email: e.target.value })}
              placeholder="exemplo@email.com"
            />

            <CampoTextarea
              label="Observações"
              value={clienteEditando.observacoes}
              onChange={(e) => setClienteEditando({ ...clienteEditando, observacoes: e.target.value })}
              placeholder="Anotações sobre o cliente"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarEditarModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmação Simples */}
      {mostrarModalSimples && (
        <Modal
          titulo="Confirmar exclusão"
          onClose={() => {
            setMostrarModalSimples(false)
            setClienteParaDeletar(null)
          }}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{clienteParaDeletar?.nome}</strong>?
            </p>
            <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalSimples(false)
                  setClienteParaDeletar(null)
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExclusaoSimples}
                disabled={excluindo}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {excluindo ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Confirmação com Senha */}
      {mostrarModalConfirmacao && (
        <Modal
          titulo="Confirmar exclusão"
          onClose={() => {
            setMostrarModalConfirmacao(false)
            setSenhaConfirmacao("")
          }}
        >
          <div className="space-y-4">
            <p className="text-gray-600">{mensagemConfirmacao}</p>

            <CampoInput
              label="Sua senha"
              type="password"
              value={senhaConfirmacao}
              onChange={(e) => setSenhaConfirmacao(e.target.value)}
              placeholder="Digite sua senha para confirmar"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalConfirmacao(false)
                  setSenhaConfirmacao("")
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExclusaoComSenha}
                disabled={excluindo}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {excluindo ? "Deletando..." : "Deletar cliente"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {aviso && (
        <ModalAviso
          {...aviso}
          onClose={() => setAviso(null)}
        />
      )}
    </AppLayout>
  )
}
