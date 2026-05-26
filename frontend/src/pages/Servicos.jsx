import { useEffect, useMemo, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import { formatarMoeda } from "../utils/formatters"
import Modal from "../components/Modal"
import ResumoCard from "../components/ResumoCard"
import CampoInput from "../components/CampoInput"
import CampoSelect from "../components/CampoSelect" 
import CampoTextarea from "../components/CampoTextarea"
import ModalAviso from "../components/ModalAviso" 
import PaginacaoLista from "../components/PaginacaoLista"
import { podeAcessar } from "../utils/permissoes"

export default function Servicos() {
  const podeCriar = podeAcessar("servicos", "criar")
  const podeEditar = podeAcessar("servicos", "editar")
  const podeExcluir = podeAcessar("servicos", "excluir")

  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState("")
  const [ordem, setOrdem] = useState("asc")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)

  const [mostrarNovoModal, setMostrarNovoModal] = useState(false)
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [novoServico, setNovoServico] = useState({
    nome: "",
    descricao: "",
    preco: "",
    duracao: "",
    status: "ativo",
    comissaoPercentual: "",
  })

  const [servicoEditando, setServicoEditando] = useState({
    id: null,
    nome: "",
    descricao: "",
    preco: "",
    duracao: "",
    status: "ativo",
    comissaoPercentual: "",
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginaAtual(1)
      carregarServicos()
    }, 300)

    return () => clearTimeout(timer)
  }, [busca, status, ordem])

  const carregarServicos = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()

      if (busca) params.append("busca", busca)
      if (status) params.append("status", status)
      if (ordem) params.append("ordem", ordem)

      const response = await api.get(`/servicos?${params.toString()}`)
      setServicos(response.data)
    } catch (error) {
      console.error("Erro ao carregar serviços:", error)
    } finally {
      setLoading(false)
    }
  }

  const abrirEditar = (servico) => {
    setServicoEditando({
      id: servico.id,
      nome: servico.nome || "",
      descricao: servico.descricao || "",
      preco: servico.preco ?? "",
      duracao: servico.duracao ?? "",
      status: servico.status || "ativo",
      comissaoPercentual: servico.comissaoPercentual ?? "",
    })
    setMostrarEditarModal(true)
  }

  const salvarNovoServico = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      await api.post("/servicos", {
        nome: novoServico.nome,
        descricao: novoServico.descricao,
        preco: Number(novoServico.preco),
        duracao: novoServico.duracao ? Number(novoServico.duracao) : null,
        status: novoServico.status,
        comissaoPercentual:
          novoServico.comissaoPercentual === ""
            ? null
            : Number(novoServico.comissaoPercentual),
      })

      setNovoServico({
        nome: "",
        descricao: "",
        preco: "",
        duracao: "",
        status: "ativo",
        comissaoPercentual: "",
      })

      setMostrarNovoModal(false)
      carregarServicos()
    } catch (error) {
      console.error("Erro ao criar serviço:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao criar serviço" })
    } finally {
      setSalvando(false)
    }
  }

  const salvarEdicaoServico = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      await api.put(`/servicos/${servicoEditando.id}`, {
        nome: servicoEditando.nome,
        descricao: servicoEditando.descricao,
        preco: Number(servicoEditando.preco),
        duracao: servicoEditando.duracao
          ? Number(servicoEditando.duracao)
          : null,
        status: servicoEditando.status,
        comissaoPercentual:
          servicoEditando.comissaoPercentual === ""
            ? null
            : Number(servicoEditando.comissaoPercentual),
      })

      setMostrarEditarModal(false)
      carregarServicos()
    } catch (error) {
      console.error("Erro ao editar serviço:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao editar serviço" })
    } finally {
      setSalvando(false)
    }
  }

  const excluirServico = async (id, nome) => {
    const confirmar = window.confirm(`Deseja excluir o serviço "${nome}"?`)
    if (!confirmar) return

    try {
      await api.delete(`/servicos/${id}`)
      carregarServicos()
    } catch (error) {
      console.error("Erro ao excluir serviço:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao excluir serviço" })
    }
  }

  const resumo = useMemo(() => {
    const total = servicos.length
    const ativos = servicos.filter((s) => s.status === "ativo").length
    const inativos = servicos.filter((s) => s.status === "inativo").length

    const ticketMedio =
      total > 0
        ? servicos.reduce((acc, s) => acc + Number(s.preco || 0), 0) / total
        : 0

    return { total, ativos, inativos, ticketMedio }
  }, [servicos])

  const servicosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return servicos.slice(inicio, inicio + itensPorPagina)
  }, [servicos, paginaAtual, itensPorPagina])

  useEffect(() => {
    const totalPaginas = Math.max(1, Math.ceil(servicos.length / itensPorPagina))
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas)
    }
  }, [servicos.length, itensPorPagina, paginaAtual])

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
              Serviços
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre, edite e organize os serviços oferecidos.
            </p>
          </div>

          {podeCriar && (
            <button
              onClick={() => setMostrarNovoModal(true)}
              className="bg-[#2F8AA3] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition shadow-sm"
            >
              + Novo Serviço
            </button>
          )}
        </div>

        {/* Busca + filtros */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="w-full xl:max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-full pl-4 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3E7996] shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatus("")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === ""
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Todos
            </button>

            <button
              type="button"
              onClick={() => setStatus("ativo")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === "ativo"
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Ativos
            </button>

            <button
              type="button"
              onClick={() => setStatus("inativo")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === "inativo"
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Inativos
            </button>

            <button
              type="button"
              onClick={() => setOrdem(ordem === "asc" ? "desc" : "asc")}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              {ordem === "asc" ? "↑ " : "↓ "}
            </button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ResumoCard
            titulo="Total de Serviços"
            valor={resumo.total}
            corIcone="bg-blue-100 text-blue-600"
          />
          <ResumoCard
            titulo="Serviços Ativos"
            valor={resumo.ativos}
            corIcone="bg-emerald-100 text-emerald-600"
          />
          <ResumoCard
            titulo="Serviços Inativos"
            valor={resumo.inativos}
            corIcone="bg-amber-100 text-amber-600"
          />
          <ResumoCard
            titulo="Preço Médio"
            valor={formatarMoeda(resumo.ticketMedio)}
            corIcone="bg-violet-100 text-violet-600"
          />
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-500">Carregando serviços...</div>
          ) : servicos.length === 0 ? (
            <div className="p-6 text-gray-500">Nenhum serviço encontrado.</div>
          ) : (
            <>
              {/* Tabela desktop */}
              <div className="hidden xl:block">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-500 border-b border-gray-100">
                  <div className="col-span-3">Serviço</div>
                  <div className="col-span-3">Descrição</div>
                  <div className="col-span-2">Preço</div>
                  <div className="col-span-1">Duracao</div>
                  <div className="col-span-1">Comissao</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right">Ações</div>
                </div>

                {servicosPaginados.map((servico) => (
                  <div
                    key={servico.id}
                    className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="col-span-3 flex items-center">
                      <p className="font-semibold text-[#2D2E47] truncate">
                        {servico.nome}
                      </p>
                    </div>

                    <div className="col-span-3 flex items-center">
                      <p className="text-sm text-gray-500 truncate">
                        {servico.descricao || "Sem descrição"}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <p className="font-medium text-[#2D2E47]">
                        {formatarMoeda(servico.preco)}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <p className="text-sm text-gray-600">
                        {servico.duracao ? `${servico.duracao} min` : "-"}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <p className="text-sm text-gray-600">
                        {servico.comissaoPercentual !== null && servico.comissaoPercentual !== undefined
                          ? `${Number(servico.comissaoPercentual)}%`
                          : "Padrao"}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          servico.status === "ativo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {servico.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-2">
                      {(podeEditar || podeExcluir) && (
                        <>
                          {podeEditar && (
                            <button
                              onClick={() => abrirEditar(servico)}
                              className="text-sm px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </button>
                          )}

                          {podeExcluir && (
                            <button
                              onClick={() => excluirServico(servico.id, servico.nome)}
                              className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Excluir
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cards mobile/tablet */}
              <div className="xl:hidden p-4 space-y-4">
                {servicosPaginados.map((servico) => (
                  <div
                    key={servico.id}
                    className="border border-gray-100 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#2D2E47]">
                          {servico.nome}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {servico.descricao || "Sem descrição"}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                          servico.status === "ativo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {servico.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Preço</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(servico.preco)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Duração</p>
                        <p className="font-medium text-[#2D2E47]">
                          {servico.duracao ? `${servico.duracao} min` : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Comissao</p>
                        <p className="font-medium text-[#2D2E47]">
                          {servico.comissaoPercentual !== null && servico.comissaoPercentual !== undefined
                            ? `${Number(servico.comissaoPercentual)}%`
                            : "Padrao"}
                        </p>
                      </div>
                    </div>

                    {(podeEditar || podeExcluir) && (
                      <div className="flex gap-2 mt-4">
                        {podeEditar && (
                          <button
                            onClick={() => abrirEditar(servico)}
                            className="text-sm px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                        )}

                        {podeExcluir && (
                          <button
                            onClick={() => excluirServico(servico.id, servico.nome)}
                            className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <PaginacaoLista
                total={servicos.length}
                pagina={paginaAtual}
                porPagina={itensPorPagina}
                onPaginaChange={setPaginaAtual}
                onPorPaginaChange={alterarItensPorPagina}
                rotulo="serviço(s)"
              />
            </>
          )}
        </div>
      </div>

      {/* Modal Novo Serviço */}
      {mostrarNovoModal && podeCriar && (
        <Modal onClose={() => setMostrarNovoModal(false)} titulo="Novo Serviço">
          <form onSubmit={salvarNovoServico} className="space-y-4">
            <CampoInput
              label="Nome do serviço *"
              value={novoServico.nome}
              onChange={(e) =>
                setNovoServico({ ...novoServico, nome: e.target.value })
              }
              placeholder="Digite o nome do serviço"
              required
            />

            <CampoTextarea
              label="Descrição"
              value={novoServico.descricao}
              onChange={(e) =>
                setNovoServico({ ...novoServico, descricao: e.target.value })
              }
              placeholder="Descreva o serviço"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CampoInput
                label="Preço *"
                type="number"
                value={novoServico.preco}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, preco: e.target.value })
                }
                placeholder="0,00"
                required
              />

              <CampoInput
                label="Duração (min)"
                type="number"
                value={novoServico.duracao}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, duracao: e.target.value })
                }
                placeholder="Ex: 60"
              />

              <CampoInput
                label="Comissao especifica (%)"
                type="number"
                value={novoServico.comissaoPercentual}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, comissaoPercentual: e.target.value })
                }
                placeholder="Padrao"
              />

              <CampoSelect
                label="Status"
                value={novoServico.status}
                onChange={(e) =>
                  setNovoServico({ ...novoServico, status: e.target.value })
                }
                options={[
                  { value: "ativo", label: "Ativo" },
                  { value: "inativo", label: "Inativo" },
                ]}
              />
            </div>

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
                {salvando ? "Salvando..." : "Salvar Serviço"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Serviço */}
      {mostrarEditarModal && podeEditar && (
        <Modal onClose={() => setMostrarEditarModal(false)} titulo="Editar Serviço">
          <form onSubmit={salvarEdicaoServico} className="space-y-4">
            <CampoInput
              label="Nome do serviço *"
              value={servicoEditando.nome}
              onChange={(e) =>
                setServicoEditando({ ...servicoEditando, nome: e.target.value })
              }
              placeholder="Digite o nome do serviço"
              required
            />

            <CampoTextarea
              label="Descrição"
              value={servicoEditando.descricao}
              onChange={(e) =>
                setServicoEditando({
                  ...servicoEditando,
                  descricao: e.target.value,
                })
              }
              placeholder="Descreva o serviço"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CampoInput
                label="Preço *"
                type="number"
                value={servicoEditando.preco}
                onChange={(e) =>
                  setServicoEditando({
                    ...servicoEditando,
                    preco: e.target.value,
                  })
                }
                placeholder="0,00"
                required
              />

              <CampoInput
                label="Duração (min)"
                type="number"
                value={servicoEditando.duracao}
                onChange={(e) =>
                  setServicoEditando({
                    ...servicoEditando,
                    duracao: e.target.value,
                  })
                }
                placeholder="Ex: 60"
              />

              <CampoInput
                label="Comissao especifica (%)"
                type="number"
                value={servicoEditando.comissaoPercentual}
                onChange={(e) =>
                  setServicoEditando({
                    ...servicoEditando,
                    comissaoPercentual: e.target.value,
                  })
                }
                placeholder="Padrao"
              />

              <CampoSelect
                label="Status"
                value={servicoEditando.status}
                onChange={(e) =>
                  setServicoEditando({
                    ...servicoEditando,
                    status: e.target.value,
                  })
                }
                options={[
                  { value: "ativo", label: "Ativo" },
                  { value: "inativo", label: "Inativo" },
                ]}
              />
            </div>

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
      {aviso && (
        <ModalAviso
          {...aviso}
          onClose={() => setAviso(null)}
        />
      )}     
    </AppLayout>
  )
}
