import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import ClienteSearchSelect from "../components/ClienteSearchSelect"
import { formatarMoeda } from "../utils/formatters"
import Modal from "../components/Modal"
import ResumoCard from "../components/ResumoCard"
import StatusBadge from "../components/StatusBadge"
import CampoInput from "../components/CampoInput"
import CampoSelect from "../components/CampoSelect"
import ModalAviso from "../components/ModalAviso" 
import PaginacaoLista from "../components/PaginacaoLista"
import { podeAcessar } from "../utils/permissoes"

export default function ContasReceber() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const podeCriar = podeAcessar("contasReceber", "criar")
  const podeReceberPagamento = podeAcessar("contasReceber", "receberPagamento")

  const [contas, setContas] = useState([])
  const [clientes, setClientes] = useState([])  
  const [loading, setLoading] = useState(true)

  const [aviso, setAviso] = useState(null)
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [clienteIdFiltro, setClienteIdFiltro] = useState("")
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

  const [mostrarNovaContaModal, setMostrarNovaContaModal] = useState(false)
  const [mostrarPagamentoModal, setMostrarPagamentoModal] = useState(false)

  const [novaConta, setNovaConta] = useState({
    clienteId: "",
    descricao: "",
    valorTotal: "",
    vencimento: ""
  })

  const [contaSelecionada, setContaSelecionada] = useState(null)
  const [pagamento, setPagamento] = useState({
    valor: "",
    formaPagamento: "",
    descricao: ""
  })

  useEffect(() => {
    setPaginaAtual(1)
  }, [status, clienteIdFiltro])

  useEffect(() => {
    setStatus(searchParams.get("status") || "")
  }, [searchParams])

  useEffect(() => {
    carregarDados()
  }, [status, clienteIdFiltro, paginaAtual, itensPorPagina])

  const carregarDados = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (status) params.append("status", status)
      if (clienteIdFiltro) params.append("clienteId", clienteIdFiltro)
      params.append("page", String(paginaAtual))
      params.append("limit", String(itensPorPagina))

      const [contasRes, clientesRes] = await Promise.all([
        api.get(`/contas-receber?${params.toString()}`),
        api.get("/clientes")
      ])

      const payload = contasRes.data || {}
      setContas(payload.data || [])
      setTotalContas(payload.pagination?.total || 0)
      setResumo({
        total: payload.summary?.total || payload.pagination?.total || 0,
        pendentes: payload.summary?.pendentes || 0,
        parciais: payload.summary?.parciais || 0,
        vencidas: payload.summary?.vencidas || 0,
        totalEmAberto: payload.summary?.totalEmAberto || 0
      })
      setClientes(clientesRes.data || [])
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error)
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

  const abrirPagamento = (conta) => {
    setContaSelecionada(conta)
    setPagamento({
      valor: getSaldoRestante(conta),
      formaPagamento: "",
      descricao: ""
    })
    setMostrarPagamentoModal(true)
  }

  const salvarNovaConta = async (e) => {
    e.preventDefault()
  
    if (!novaConta.clienteId) {
      setAviso({ titulo: "Erro", mensagem: "Selecione um cliente para criar a conta." })
      return
    }
  
    if (!novaConta.valorTotal || Number(novaConta.valorTotal) <= 0) {
      setAviso({ titulo: "Erro", mensagem: "Informe um valor total válido." })
      return
    }
  
    try {
      await api.post("/contas-receber", {
        clienteId: Number(novaConta.clienteId),
        descricao: novaConta.descricao || null,
        valorTotal: Number(novaConta.valorTotal),
        vencimento: novaConta.vencimento || null
      })
  
      setNovaConta({
        clienteId: "",
        descricao: "",
        valorTotal: "",
        vencimento: ""
      })
  
      setMostrarNovaContaModal(false)
      carregarDados()
    } catch (error) {
      console.error("Erro ao criar conta:", error)
      console.error("Resposta do backend:", error.response?.data)
  
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao criar conta" })
    }
  }

  const registrarPagamento = async (e) => {
    e.preventDefault()
  
    if (!contaSelecionada) return
  
    if (!pagamento.valor || Number(pagamento.valor) <= 0) {
      setAviso({ titulo: "Erro", mensagem: "Informe um valor de pagamento válido." })
      return
    }
  
    try {
      await api.post(`/contas-receber/${contaSelecionada.id}/pagamentos`, {
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
      carregarDados()
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error)
      console.error("Resposta do backend:", error.response?.data)
      console.error("Status:", error.response?.status)
  
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao registrar pagamento" })
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Contas a Receber
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Controle valores pendentes, pagamentos e vencimentos.
            </p>
          </div>

          {podeCriar && (
            <button
              onClick={() => setMostrarNovaContaModal(true)}
              className="bg-[#2F8AA3] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition shadow-sm"
            >
              + Nova Conta
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
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
              Todas
            </button>

            <button
              type="button"
              onClick={() => setStatus("pendente")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === "pendente"
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Pendentes
            </button>

            <button
              type="button"
              onClick={() => setStatus("parcial")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === "parcial"
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Parciais
            </button>

            <button
              type="button"
              onClick={() => setStatus("vencido")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === "vencido"
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Vencidas
            </button>

            <button
              type="button"
              onClick={() => setStatus("pago")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                status === "pago"
                  ? "bg-[#2F8AA3] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Pagas
            </button>
          </div>
          <div className="w-full xl:max-w-sm">
          <ClienteSearchSelect
            clientes={clientes}
            clienteId={clienteIdFiltro}
            setClienteId={setClienteIdFiltro}
            placeholder="Buscar cliente para filtrar"
            permitirSemCliente={true}
          />
        </div>
         
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            corIcone="bg-violet-100 text-violet-600"
            icon="badgeDollar"
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
                  <div className="col-span-3">Cliente</div>
                  <div className="col-span-2">Descrição</div>
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
                    <button
                      type="button"
                      onClick={() => navigate(`/clientes/${conta.clienteId}/financeiro`)}
                      className="font-semibold text-[#2D2E47] hover:text-[#2F8AA3] hover:underline text-left"
                    >
                      {conta.cliente?.nome || "Sem cliente"}
                    </button>
                      <p className="text-sm text-gray-500">
                        Conta #{conta.id}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">
                        {conta.descricao || "Sem descrição"}
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
                      {conta.status !== "pago" && podeReceberPagamento && (
                        <button
                          onClick={() => abrirPagamento(conta)}
                          className="text-sm px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          Receber
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="xl:hidden p-4 space-y-4">
                {contas.map((conta) => (
                  <div
                    key={conta.id}
                    className="border border-gray-100 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#2D2E47]">
                          {conta.cliente?.nome || "Sem cliente"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {conta.descricao || "Sem descrição"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Conta #{conta.id}
                        </p>
                      </div>

                      <StatusBadge status={conta.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Valor total</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(conta.valorTotal)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Valor pago</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(conta.valorPago)}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Saldo restante</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarMoeda(getSaldoRestante(conta))}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Vencimento</p>
                        <p className="font-medium text-[#2D2E47]">
                          {formatarData(conta.vencimento)}
                        </p>
                      </div>
                    </div>

                    {conta.status !== "pago" && podeReceberPagamento && (
                      <div className="mt-4">
                        <button
                          onClick={() => abrirPagamento(conta)}
                          className="text-sm px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          Receber pagamento
                        </button>
                      </div>
                    )}
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

      {mostrarNovaContaModal && podeCriar && (
        <Modal onClose={() => setMostrarNovaContaModal(false)} titulo="Nova Conta a Receber">
          <form onSubmit={salvarNovaConta} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2E47] mb-2">
              Cliente *
            </label>

            <ClienteSearchSelect
              clientes={clientes}
              clienteId={novaConta.clienteId}
              setClienteId={(id) =>
                setNovaConta({ ...novaConta, clienteId: id })
              }
              placeholder="Digite o nome do cliente"
              permitirSemCliente={false}
            />
          </div>
            <CampoInput
              label="Descrição"
              value={novaConta.descricao}
              onChange={(e) =>
                setNovaConta({ ...novaConta, descricao: e.target.value })
              }
              placeholder="Ex: venda parcelada"
            />

            <CampoInput
              label="Valor total *"
              type="number"
              value={novaConta.valorTotal}
              onChange={(e) =>
                setNovaConta({ ...novaConta, valorTotal: e.target.value })
              }
              placeholder="0,00"
              required
            />

            <CampoInput
              label="Vencimento"
              type="date"
              value={novaConta.vencimento}
              onChange={(e) =>
                setNovaConta({ ...novaConta, vencimento: e.target.value })
              }
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarNovaContaModal(false)}
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

      {mostrarPagamentoModal && contaSelecionada && podeReceberPagamento && (
        <Modal onClose={() => setMostrarPagamentoModal(false)} titulo="Registrar Pagamento">
          <form onSubmit={registrarPagamento} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium text-[#2D2E47]">
                {contaSelecionada.cliente?.nome}
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
              options={[
                { value: "", label: "Selecione" },
                { value: "dinheiro", label: "Dinheiro" },
                { value: "pix", label: "Pix" },
                { value: "cartao_credito", label: "Cartão de crédito" },
                { value: "cartao_debito", label: "Cartão de débito" }
              ]}
            />

            <CampoInput
              label="Descrição"
              value={pagamento.descricao}
              onChange={(e) =>
                setPagamento({ ...pagamento, descricao: e.target.value })
              }
              placeholder="Ex: pagamento da 1ª parcela"
            />

            <div className="flex justify-end gap-3 pt-2">
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
