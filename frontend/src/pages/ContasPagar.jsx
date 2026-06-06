import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import { formatarMoeda } from "../utils/formatters"
import Modal from "../components/Modal"
import ResumoCard from "../components/ResumoCard"
import StatusBadge from "../components/StatusBadge"
import CampoInput from "../components/CampoInput"
import CampoSelect from "../components/CampoSelect"
import CampoTextarea from "../components/CampoTextarea"
import ModalAviso from "../components/ModalAviso"
import PaginacaoLista from "../components/PaginacaoLista"
import { podeAcessar } from "../utils/permissoes"

const categoriasSaida = [
  "Produto/Estoque",
  "Material",
  "Aluguel",
  "Conta fixa",
  "Marketing",
  "Comissão",
  "Pagamento funcionário",
  "Manutenção",
  "Outro"
]

const formasPagamento = [
  { value: "", label: "Selecione" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" }
]

const contaInicial = {
  descricao: "",
  categoria: "Conta fixa",
  valorTotal: "",
  vencimento: "",
  observacoes: ""
}

export default function ContasPagar() {
  const [searchParams] = useSearchParams()
  const podeCriar = podeAcessar("contasPagar", "criar")
  const podeEditar = podeAcessar("contasPagar", "editar")
  const podePagar = podeAcessar("contasPagar", "pagar")
  const podeCancelar = podeAcessar("contasPagar", "excluir")

  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [aviso, setAviso] = useState(null)
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [categoria, setCategoria] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [totalContas, setTotalContas] = useState(0)
  const [resumo, setResumo] = useState({
    total: 0,
    pendentes: 0,
    parciais: 0,
    vencidas: 0,
    totalEmAberto: 0
  })

  const [mostrarContaModal, setMostrarContaModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [contaEditandoId, setContaEditandoId] = useState(null)
  const [formConta, setFormConta] = useState(contaInicial)

  const [mostrarPagamentoModal, setMostrarPagamentoModal] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState(null)
  const [pagamento, setPagamento] = useState({
    valor: "",
    formaPagamento: "",
    descricao: ""
  })

  useEffect(() => {
    setPaginaAtual(1)
  }, [status, categoria])

  useEffect(() => {
    setStatus(searchParams.get("status") || "")
  }, [searchParams])

  useEffect(() => {
    carregarContas()
  }, [status, categoria, paginaAtual, itensPorPagina])

  const carregarContas = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (status) params.append("status", status)
      if (categoria) params.append("categoria", categoria)
      params.append("page", String(paginaAtual))
      params.append("limit", String(itensPorPagina))

      const res = await api.get(`/contas-pagar?${params.toString()}`)
      const payload = res.data || {}
      setContas(payload.data || [])
      setTotalContas(payload.pagination?.total || 0)
      setResumo({
        total: payload.summary?.total || payload.pagination?.total || 0,
        pendentes: payload.summary?.pendentes || 0,
        parciais: payload.summary?.parciais || 0,
        vencidas: payload.summary?.vencidas || 0,
        totalEmAberto: payload.summary?.totalEmAberto || 0
      })
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao carregar contas a pagar"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatarData = (data) => {
    if (!data) return "Sem vencimento"
    return new Date(data).toLocaleDateString("pt-BR")
  }

  const getSaldoRestante = (conta) => {
    return Number(conta.valorTotal || 0) - Number(conta.valorPago || 0)
  }

  useEffect(() => {
    const totalPaginas = Math.max(1, Math.ceil(totalContas / itensPorPagina))
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas)
    }
  }, [totalContas, itensPorPagina, paginaAtual])

  const alterarItensPorPagina = (valor) => {
    setItensPorPagina(valor)
    setPaginaAtual(1)
  }

  const abrirNovaConta = () => {
    setModoEdicao(false)
    setContaEditandoId(null)
    setFormConta(contaInicial)
    setMostrarContaModal(true)
  }

  const abrirEditarConta = (conta) => {
    setModoEdicao(true)
    setContaEditandoId(conta.id)
    setFormConta({
      descricao: conta.descricao || "",
      categoria: conta.categoria || "Conta fixa",
      valorTotal: conta.valorTotal ? String(conta.valorTotal) : "",
      vencimento: conta.vencimento ? conta.vencimento.slice(0, 10) : "",
      observacoes: conta.observacoes || ""
    })
    setMostrarContaModal(true)
  }

  const salvarConta = async (e) => {
    e.preventDefault()

    if (!formConta.descricao.trim()) {
      setAviso({ titulo: "Erro", mensagem: "Informe a descrição da conta." })
      return
    }

    if (!formConta.valorTotal || Number(formConta.valorTotal) <= 0) {
      setAviso({ titulo: "Erro", mensagem: "Informe um valor total válido." })
      return
    }

    const payload = {
      descricao: formConta.descricao.trim(),
      categoria: formConta.categoria || null,
      valorTotal: Number(formConta.valorTotal),
      vencimento: formConta.vencimento || null,
      observacoes: formConta.observacoes || null
    }

    try {
      if (modoEdicao) {
        await api.put(`/contas-pagar/${contaEditandoId}`, payload)
      } else {
        await api.post("/contas-pagar", payload)
      }

      setMostrarContaModal(false)
      setFormConta(contaInicial)
      carregarContas()
    } catch (error) {
      console.error("Erro ao salvar conta a pagar:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao salvar conta a pagar"
      })
    }
  }

  const abrirPagamento = (conta) => {
    setContaSelecionada(conta)
    setPagamento({
      valor: getSaldoRestante(conta),
      formaPagamento: "",
      descricao: ""
    })
    setMostrarPagamentoModal(true)
  }

  const registrarPagamento = async (e) => {
    e.preventDefault()

    if (!contaSelecionada) return

    if (!pagamento.valor || Number(pagamento.valor) <= 0) {
      setAviso({ titulo: "Erro", mensagem: "Informe um valor de pagamento válido." })
      return
    }

    try {
      await api.post(`/contas-pagar/${contaSelecionada.id}/pagamentos`, {
        valor: Number(pagamento.valor),
        formaPagamento: pagamento.formaPagamento || null,
        descricao: pagamento.descricao || null
      })

      setPagamento({
        valor: "",
        formaPagamento: "",
        descricao: ""
      })
      setContaSelecionada(null)
      setMostrarPagamentoModal(false)
      carregarContas()
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao registrar pagamento"
      })
    }
  }

  const confirmarCancelamento = (conta) => {
    setAviso({
      titulo: "Cancelar conta",
      mensagem: `Deseja cancelar a conta "${conta.descricao}"?`,
      tipo: "confirmacao",
      labelConfirmar: "Cancelar conta",
      corConfirmar: "bg-red-600",
      onConfirmar: async () => {
        try {
          await api.patch(`/contas-pagar/${conta.id}/cancelar`)
          setAviso(null)
          carregarContas()
        } catch (error) {
          console.error("Erro ao cancelar conta:", error)
          setAviso({
            titulo: "Erro",
            mensagem: error.response?.data?.error || "Erro ao cancelar conta"
          })
        }
      }
    })
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Contas a Pagar
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Controle despesas futuras, vencimentos e pagamentos da empresa.
            </p>
          </div>

          {podeCriar && (
            <button
              onClick={abrirNovaConta}
              className="w-full md:w-auto bg-[#2F8AA3] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition shadow-sm"
            >
              + Nova Conta
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Todas", value: "" },
              { label: "Pendentes", value: "pendente" },
              { label: "Parciais", value: "parcial" },
              { label: "Vencidas", value: "vencido" },
              { label: "Pagas", value: "pago" },
              { label: "Canceladas", value: "cancelada" }
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  status === item.value
                    ? "bg-[#2F8AA3] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full xl:w-64 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#2D2E47] outline-none focus:ring-2 focus:ring-[#3E7996]"
          >
            <option value="">Todas as categorias</option>
            {categoriasSaida.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
          <ResumoCard
            titulo="Total de Contas"
            valor={resumo.total}
            corIcone="bg-blue-100 text-blue-600"
            icon="receiptSimple"
          />
          <ResumoCard
            titulo="Pendentes + Parciais"
            valor={resumo.pendentes + resumo.parciais}
            corIcone="bg-amber-100 text-amber-600"
            icon="clockAlert"
          />
          <ResumoCard
            titulo="Vencidas"
            valor={resumo.vencidas}
            corIcone="bg-red-100 text-red-600"
            icon="alarm"
          />
          <ResumoCard
            titulo="Total em Aberto"
            valor={formatarMoeda(resumo.totalEmAberto)}
            corIcone="bg-rose-100 text-rose-600"
            icon="arrowUp"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-500">Carregando contas...</div>
          ) : contas.length === 0 ? (
            <div className="p-6 text-gray-500">Nenhuma conta encontrada.</div>
          ) : (
            <>
              <div className="hidden xl:block">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-500 border-b border-gray-100">
                  <div className="col-span-3">Descrição</div>
                  <div className="col-span-2">Categoria</div>
                  <div className="col-span-2">Valores</div>
                  <div className="col-span-2">Vencimento</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>

                {contas.map((conta) => (
                  <div
                    key={conta.id}
                    className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="col-span-3">
                      <p className="font-semibold text-[#2D2E47]">
                        {conta.descricao}
                      </p>
                      <p className="text-sm text-gray-500">
                        Conta #{conta.id}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <p className="text-sm text-gray-600">
                        {conta.categoria || "Sem categoria"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm text-gray-700">
                        Total: {formatarMoeda(conta.valorTotal)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Pago: {formatarMoeda(conta.valorPago)}
                      </p>
                      <p className="text-sm font-medium text-[#2D2E47]">
                        Saldo: {formatarMoeda(getSaldoRestante(conta))}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <p className="text-sm text-gray-600">
                        {formatarData(conta.vencimento)}
                      </p>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <StatusBadge status={conta.status} />
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {!["pago", "cancelada"].includes(conta.status) && podePagar && (
                        <button
                          onClick={() => abrirPagamento(conta)}
                          className="text-sm px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          Pagar
                        </button>
                      )}

                      {!["pago", "cancelada"].includes(conta.status) && podeEditar && (
                        <button
                          onClick={() => abrirEditarConta(conta)}
                          className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                      )}

                      {conta.status !== "cancelada" && conta.valorPago <= 0 && podeCancelar && (
                        <button
                          onClick={() => confirmarCancelamento(conta)}
                          className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="xl:hidden p-3 space-y-3">
                {contas.map((conta) => (
                  <div
                    key={conta.id}
                    className="border border-gray-100 rounded-2xl p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#2D2E47] break-words">
                          {conta.descricao}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {conta.categoria || "Sem categoria"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Conta #{conta.id}
                        </p>
                      </div>

                      <StatusBadge status={conta.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[11px] text-gray-400">Valor total</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(conta.valorTotal)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-400">Valor pago</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(conta.valorPago)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-400">Saldo</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(getSaldoRestante(conta))}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-gray-400">Vencimento</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarData(conta.vencimento)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      {!["pago", "cancelada"].includes(conta.status) && podePagar && (
                        <button
                          onClick={() => abrirPagamento(conta)}
                          className="w-full sm:w-auto text-sm px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          Pagar
                        </button>
                      )}

                      {!["pago", "cancelada"].includes(conta.status) && podeEditar && (
                        <button
                          onClick={() => abrirEditarConta(conta)}
                          className="w-full sm:w-auto text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                      )}

                      {conta.status !== "cancelada" && conta.valorPago <= 0 && podeCancelar && (
                        <button
                          onClick={() => confirmarCancelamento(conta)}
                          className="w-full sm:w-auto text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <PaginacaoLista
                total={totalContas}
                pagina={paginaAtual}
                porPagina={itensPorPagina}
                onPaginaChange={setPaginaAtual}
                onPorPaginaChange={alterarItensPorPagina}
                rotulo="conta(s)"
              />
            </>
          )}
        </div>
      </div>

      {mostrarContaModal && (podeCriar || podeEditar) && (
        <Modal
          onClose={() => setMostrarContaModal(false)}
          titulo={modoEdicao ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
        >
          <form onSubmit={salvarConta} className="space-y-4">
            <CampoInput
              label="Descrição *"
              value={formConta.descricao}
              onChange={(e) =>
                setFormConta({ ...formConta, descricao: e.target.value })
              }
              placeholder="Ex: aluguel, internet, fornecedor"
              required
            />

            <CampoSelect
              label="Categoria"
              value={formConta.categoria}
              onChange={(e) =>
                setFormConta({ ...formConta, categoria: e.target.value })
              }
              options={[
                { value: "", label: "Selecione" },
                ...categoriasSaida.map((cat) => ({ value: cat, label: cat }))
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoInput
                label="Valor total *"
                type="number"
                value={formConta.valorTotal}
                onChange={(e) =>
                  setFormConta({ ...formConta, valorTotal: e.target.value })
                }
                placeholder="0,00"
                required
              />

              <CampoInput
                label="Vencimento"
                type="date"
                value={formConta.vencimento}
                onChange={(e) =>
                  setFormConta({ ...formConta, vencimento: e.target.value })
                }
              />
            </div>

            <CampoTextarea
              label="Observações"
              value={formConta.observacoes}
              onChange={(e) =>
                setFormConta({ ...formConta, observacoes: e.target.value })
              }
              placeholder="Detalhes da cobrança"
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarContaModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90"
              >
                Salvar Conta
              </button>
            </div>
          </form>
        </Modal>
      )}

      {mostrarPagamentoModal && contaSelecionada && podePagar && (
        <Modal onClose={() => setMostrarPagamentoModal(false)} titulo="Registrar Pagamento">
          <form onSubmit={registrarPagamento} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Conta</p>
              <p className="font-medium text-[#2D2E47]">
                {contaSelecionada.descricao}
              </p>

              <p className="text-sm text-gray-500 mt-3">Saldo restante</p>
              <p className="font-semibold text-[#2D2E47]">
                {formatarMoeda(getSaldoRestante(contaSelecionada))}
              </p>
            </div>

            <CampoInput
              label="Valor *"
              type="number"
              value={pagamento.valor}
              onChange={(e) =>
                setPagamento({ ...pagamento, valor: e.target.value })
              }
              placeholder="0,00"
              required
            />

            <CampoSelect
              label="Forma de pagamento"
              value={pagamento.formaPagamento}
              onChange={(e) =>
                setPagamento({ ...pagamento, formaPagamento: e.target.value })
              }
              options={formasPagamento}
            />

            <CampoInput
              label="Descrição"
              value={pagamento.descricao}
              onChange={(e) =>
                setPagamento({ ...pagamento, descricao: e.target.value })
              }
              placeholder="Ex: pagamento do boleto"
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarPagamentoModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90"
              >
                Confirmar Pagamento
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
