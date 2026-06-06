import { useEffect, useState } from "react"
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

export default function Produtos() {
  const podeCriar = podeAcessar("produtos", "criar")
  const podeEditar = podeAcessar("produtos", "editar")
  const podeExcluir = podeAcessar("produtos", "excluir")

  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState("")
  const [status, setStatus] = useState("")
  const [ordem, setOrdem] = useState("asc")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [resumo, setResumo] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    precoMedio: 0
  })

  const [mostrarNovoModal, setMostrarNovoModal] = useState(false)
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    descricao: "",
    precoVarejo: "",
    precoAtacado: "",
    precoCusto: "",
    estoque: "",
    status: "ativo",
    comissaoPercentual: "",
  })

  const [produtoEditando, setProdutoEditando] = useState({
    id: null,
    nome: "",
    descricao: "",
    precoVarejo: "",
    precoAtacado: "",
    precoCusto: "",
    estoque: "",
    status: "ativo",
    comissaoPercentual: "",
  })

  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, status, ordem])

  useEffect(() => {
    const timer = setTimeout(carregarProdutos, 300)
    return () => clearTimeout(timer)
  }, [busca, status, ordem, paginaAtual, itensPorPagina])

  const carregarProdutos = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()

      if (busca) params.append("busca", busca)
      if (status) params.append("status", status)
      if (ordem) params.append("ordem", ordem)
      params.append("page", String(paginaAtual))
      params.append("limit", String(itensPorPagina))

      const response = await api.get(`/produtos?${params.toString()}`)
      const payload = response.data || {}
      setProdutos(payload.data || [])
      setTotalProdutos(payload.pagination?.total || 0)
      setResumo({
        total: payload.summary?.total || payload.pagination?.total || 0,
        ativos: payload.summary?.ativos || 0,
        inativos: payload.summary?.inativos || 0,
        precoMedio: payload.summary?.precoMedio || 0
      })
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const totalPaginas = Math.max(1, Math.ceil(totalProdutos / itensPorPagina))
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas)
    }
  }, [totalProdutos, itensPorPagina, paginaAtual])

  const alterarItensPorPagina = (valor) => {
    setItensPorPagina(valor)
    setPaginaAtual(1)
  }

  const abrirEditar = (produto) => {
    setProdutoEditando({
      id: produto.id,
      nome: produto.nome || "",
      descricao: produto.descricao || "",
      precoVarejo: produto.precoVarejo ?? "",
      precoAtacado: produto.precoAtacado ?? "",
      precoCusto: produto.precoCusto ?? "",
      estoque: produto.estoque ?? "",
      status: produto.status || "ativo",
      comissaoPercentual: produto.comissaoPercentual ?? "",
    })
    setMostrarEditarModal(true)
  }

  const salvarNovoProduto = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      await api.post("/produtos", {
        nome: novoProduto.nome,
        descricao: novoProduto.descricao,
        precoVarejo: Number(novoProduto.precoVarejo),
        precoAtacado: novoProduto.precoAtacado
          ? Number(novoProduto.precoAtacado)
          : null,
        precoCusto: novoProduto.precoCusto !== undefined && novoProduto.precoCusto !== ""
          ? Number(novoProduto.precoCusto)
          : null,
        estoque: novoProduto.estoque ? Number(novoProduto.estoque) : null,
        status: novoProduto.status,
        comissaoPercentual:
          novoProduto.comissaoPercentual === ""
            ? null
            : Number(novoProduto.comissaoPercentual),
      })

      setNovoProduto({
        nome: "",
        descricao: "",
        precoVarejo: "",
        precoAtacado: "",
        precoCusto: "",
        estoque: "",
        status: "ativo",
        comissaoPercentual: "",
      })

      setMostrarNovoModal(false)
      carregarProdutos()
    } catch (error) {
      console.error("Erro ao criar produto:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao criar produto" })
    } finally {
      setSalvando(false)
    }
  }

  const salvarEdicaoProduto = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      await api.put(`/produtos/${produtoEditando.id}`, {
        nome: produtoEditando.nome,
        descricao: produtoEditando.descricao,
        precoVarejo: Number(produtoEditando.precoVarejo),
        precoAtacado: produtoEditando.precoAtacado
          ? Number(produtoEditando.precoAtacado)
          : null,
        precoCusto: produtoEditando.precoCusto !== undefined && produtoEditando.precoCusto !== ""
          ? Number(produtoEditando.precoCusto)
          : null,
        estoque: produtoEditando.estoque ? Number(produtoEditando.estoque) : null,
        status: produtoEditando.status,
        comissaoPercentual:
          produtoEditando.comissaoPercentual === ""
            ? null
            : Number(produtoEditando.comissaoPercentual),
      })

      setMostrarEditarModal(false)
      carregarProdutos()
    } catch (error) {
      console.error("Erro ao editar produto:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao editar produto" })
    } finally {
      setSalvando(false)
    }
  }

  const excluirProduto = async (id, nome) => {
    const confirmar = window.confirm(`Deseja excluir o produto "${nome}"?`)
    if (!confirmar) return

    try {
      await api.delete(`/produtos/${id}`)
      carregarProdutos()
    } catch (error) {
      console.error("Erro ao excluir produto:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao excluir produto" })
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Produtos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre, edite e organize os produtos disponíveis para venda.
            </p>
          </div>

          {podeCriar && (
            <button
              onClick={() => setMostrarNovoModal(true)}
              className="bg-[#2F8AA3] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition shadow-sm"
            >
              + Novo Produto
            </button>
          )}
        </div>

        {/* Busca + filtros */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="w-full xl:max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar produto..."
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
              {ordem === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ResumoCard
            titulo="Total de Produtos"
            valor={resumo.total}
            corIcone="bg-blue-100 text-blue-600"
            icon="box"
          />
          <ResumoCard
            titulo="Produtos Ativos"
            valor={resumo.ativos}
            corIcone="bg-emerald-100 text-emerald-600"
            icon="packageCheck"
          />
          <ResumoCard
            titulo="Produtos Inativos"
            valor={resumo.inativos}
            corIcone="bg-amber-100 text-amber-600"
            icon="packageX"
          />
          <ResumoCard
            titulo="Preço Médio"
            valor={formatarMoeda(resumo.precoMedio)}
            corIcone="bg-violet-100 text-violet-600"
            icon="tags"
          />
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-500">Carregando produtos...</div>
          ) : produtos.length === 0 ? (
            <div className="p-6 text-gray-500">Nenhum produto encontrado.</div>
          ) : (
            <>
              {/* Tabela desktop */}
              <div className="hidden xl:block">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-500 border-b border-gray-100">
                  <div className="col-span-3">Produto</div>
                  <div className="col-span-2">Descrição</div>
                  <div className="col-span-2">Preço Varejo</div>
                  <div className="col-span-1">Custo</div>
                  <div className="col-span-1">Atacado</div>
                  <div className="col-span-1">Comissao</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right">Ações</div>
                </div>

                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="col-span-3 flex items-center min-w-0">
                      <p className="font-semibold text-[#2D2E47] truncate">
                        {produto.nome}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center min-w-0">
                      <p className="text-sm text-gray-500 truncate">
                        {produto.descricao || "Sem descrição"}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <p className="font-medium text-[#2D2E47]">
                        {formatarMoeda(produto.precoVarejo)}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <p className="text-sm text-gray-600">
                        {produto.precoCusto
                          ? formatarMoeda(produto.precoCusto)
                          : "-"}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <p className="text-sm text-gray-600">
                        {produto.precoAtacado
                          ? formatarMoeda(produto.precoAtacado)
                          : "-"}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <p className="text-sm text-gray-600">
                        {produto.comissaoPercentual !== null && produto.comissaoPercentual !== undefined
                          ? `${Number(produto.comissaoPercentual)}%`
                          : "Padrao"}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          produto.status === "ativo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {produto.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-2">
                      {(podeEditar || podeExcluir) && (
                        <>
                          {podeEditar && (
                            <button
                              onClick={() => abrirEditar(produto)}
                              className="text-sm px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </button>
                          )}

                          {podeExcluir && (
                            <button
                              onClick={() => excluirProduto(produto.id, produto.nome)}
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
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className="border border-gray-100 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#2D2E47]">
                          {produto.nome}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {produto.descricao || "Sem descrição"}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                          produto.status === "ativo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {produto.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Preço Varejo</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(produto.precoVarejo)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Preço Atacado</p>
                        <p className="font-medium text-[#2D2E47]">
                          {produto.precoAtacado
                            ? formatarMoeda(produto.precoAtacado)
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Estoque</p>
                        <p className="font-medium text-[#2D2E47]">
                          {produto.estoque ?? "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Comissao</p>
                        <p className="font-medium text-[#2D2E47]">
                          {produto.comissaoPercentual !== null && produto.comissaoPercentual !== undefined
                            ? `${Number(produto.comissaoPercentual)}%`
                            : "Padrao"}
                        </p>
                      </div>
                    </div>

                    {(podeEditar || podeExcluir) && (
                      <div className="flex gap-2 mt-4">
                        {podeEditar && (
                          <button
                            onClick={() => abrirEditar(produto)}
                            className="text-sm px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                        )}

                        {podeExcluir && (
                          <button
                            onClick={() => excluirProduto(produto.id, produto.nome)}
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
                total={totalProdutos}
                pagina={paginaAtual}
                porPagina={itensPorPagina}
                onPaginaChange={setPaginaAtual}
                onPorPaginaChange={alterarItensPorPagina}
                rotulo="produto(s)"
              />
            </>
          )}
        </div>
      </div>

      {/* Modal Novo Produto */}
      {mostrarNovoModal && podeCriar && (
        <Modal onClose={() => setMostrarNovoModal(false)} titulo="Novo Produto">
          <form onSubmit={salvarNovoProduto} className="space-y-4">
            <CampoInput
              label="Nome do produto *"
              value={novoProduto.nome}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, nome: e.target.value })
              }
              placeholder="Digite o nome do produto"
              required
            />

            <CampoTextarea
              label="Descrição"
              value={novoProduto.descricao}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, descricao: e.target.value })
              }
              placeholder="Descreva o produto"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoInput
                label="Preço Varejo *"
                type="number"
                value={novoProduto.precoVarejo}
                onChange={(e) =>
                  setNovoProduto({ ...novoProduto, precoVarejo: e.target.value })
                }
                placeholder="0,00"
                required
              />

              <CampoInput
                label="Preço de Custo"
                type="number"
                value={novoProduto.precoCusto}
                onChange={(e) =>
                  setNovoProduto({ ...novoProduto, precoCusto: e.target.value })
                }
                placeholder="0,00"
              />

              <CampoInput
                label="Preço Atacado"
                type="number"
                value={novoProduto.precoAtacado}
                onChange={(e) =>
                  setNovoProduto({ ...novoProduto, precoAtacado: e.target.value })
                }
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoInput
                label="Estoque"
                type="number"
                value={novoProduto.estoque}
                onChange={(e) =>
                  setNovoProduto({ ...novoProduto, estoque: e.target.value })
                }
                placeholder="Ex: 20"
              />

              <CampoInput
                label="Comissao especifica (%)"
                type="number"
                value={novoProduto.comissaoPercentual}
                onChange={(e) =>
                  setNovoProduto({ ...novoProduto, comissaoPercentual: e.target.value })
                }
                placeholder="Padrao"
              />

              <CampoSelect
                label="Status"
                value={novoProduto.status}
                onChange={(e) =>
                  setNovoProduto({ ...novoProduto, status: e.target.value })
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
                {salvando ? "Salvando..." : "Salvar Produto"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Produto */}
      {mostrarEditarModal && podeEditar && (
        <Modal onClose={() => setMostrarEditarModal(false)} titulo="Editar Produto">
          <form onSubmit={salvarEdicaoProduto} className="space-y-4">
            <CampoInput
              label="Nome do produto *"
              value={produtoEditando.nome}
              onChange={(e) =>
                setProdutoEditando({ ...produtoEditando, nome: e.target.value })
              }
              placeholder="Digite o nome do produto"
              required
            />

            <CampoTextarea
              label="Descrição"
              value={produtoEditando.descricao}
              onChange={(e) =>
                setProdutoEditando({
                  ...produtoEditando,
                  descricao: e.target.value,
                })
              }
              placeholder="Descreva o produto"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoInput
                label="Preço Varejo *"
                type="number"
                value={produtoEditando.precoVarejo}
                onChange={(e) =>
                  setProdutoEditando({
                    ...produtoEditando,
                    precoVarejo: e.target.value,
                  })
                }
                placeholder="0,00"
                required
              />

              <CampoInput
                label="Preço Atacado"
                type="number"
                value={produtoEditando.precoAtacado}
                onChange={(e) =>
                  setProdutoEditando({
                    ...produtoEditando,
                    precoAtacado: e.target.value,
                  })
                }
                placeholder="0,00"
              />

              <CampoInput
                label="Preço de Custo"
                type="number"
                value={produtoEditando.precoCusto}
                onChange={(e) =>
                  setProdutoEditando({
                    ...produtoEditando,
                    precoCusto: e.target.value,
                  })
                }
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoInput
                label="Estoque"
                type="number"
                value={produtoEditando.estoque}
                onChange={(e) =>
                  setProdutoEditando({
                    ...produtoEditando,
                    estoque: e.target.value,
                  })
                }
                placeholder="Ex: 20"
              />

              <CampoInput
                label="Comissao especifica (%)"
                type="number"
                value={produtoEditando.comissaoPercentual}
                onChange={(e) =>
                  setProdutoEditando({
                    ...produtoEditando,
                    comissaoPercentual: e.target.value,
                  })
                }
                placeholder="Padrao"
              />

              <CampoSelect
                label="Status"
                value={produtoEditando.status}
                onChange={(e) =>
                  setProdutoEditando({
                    ...produtoEditando,
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
