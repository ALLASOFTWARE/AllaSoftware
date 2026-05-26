import { useEffect, useMemo, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import Modal from "../components/Modal"
import ModalAviso from "../components/ModalAviso"
import ResumoCard from "../components/ResumoCard"
import StatusBadge from "../components/StatusBadge"
import CampoInput from "../components/CampoInput"
import CampoSelect from "../components/CampoSelect"
import CampoTextarea from "../components/CampoTextarea"
import ClienteSearchSelect from "../components/ClienteSearchSelect.jsx"
import { formatarData, formatarDataHora, formatarMoeda } from "../utils/formatters"


const STATUS_CORES = {
  agendado: {
    bg: "bg-[#2F8AA3]",
    bgSoft: "bg-[#E6F2F6]",
    border: "border-[#2F8AA3]",
    text: "text-[#1F6A80]",
    dot: "bg-[#2F8AA3]"
  },
  concluido: {
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  cancelado: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-50",
    border: "border-rose-400",
    text: "text-rose-700",
    dot: "bg-rose-400"
  }
}

const HORA_INICIAL = 7   // 07:00
const HORA_FINAL   = 22  // 22:00

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicos, setServicos] = useState([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const [statusFiltro, setStatusFiltro] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  // Visualização: "mes" | "semana" | "dia" | "lista"
  const [visao, setVisao] = useState("semana")
  const [dataReferencia, setDataReferencia] = useState(new Date())

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [agendamentoEditandoId, setAgendamentoEditandoId] = useState(null)
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null)

  const usuarioLogado = JSON.parse(localStorage.getItem("usuario"))

  const [profissionais, setProfissionais] = useState([])
  const [profissionalFiltro, setProfissionalFiltro] = useState("")

  const [mostrarModalConclusao, setMostrarModalConclusao] = useState(false)
  const [agendamentoConcluir, setAgendamentoConcluir] = useState(null)

  const [clienteFiltro, setClienteFiltro] = useState("")
  const [clienteFiltroNome, setClienteFiltroNome] = useState("")

  const [formConclusao, setFormConclusao] = useState({
    valorPago: "",
    formaPagamento: "",
    fiado: false,
    vencimento: "",
    observacoesPagamento: ""
  })

  const [form, setForm] = useState({
    clienteId: "",
    clienteNome: "",
    servicoId: "",
    profissionalId: "", 
    titulo: "",
    descricao: "",
    dataHora: "",
    status: "agendado",
    observacoes: ""
  })

  useEffect(() => { carregarBase() }, [])
  useEffect(() => { carregarAgendamentos() }, [statusFiltro, dataInicio, dataFim, profissionalFiltro, clienteFiltro])
  useEffect(() => {
    if (clienteFiltro) {
      setVisao("lista")
    } else {
      setVisao("semana")
    }
  }, [clienteFiltro])

  const carregarBase = async () => {
    try {
      const [clientesRes, servicosRes, profissionaisRes] = await Promise.all([
        api.get("/clientes"),
        api.get("/servicos"),
        api.get("/profissionais")
      ])
      setClientes(clientesRes.data || [])
      setServicos(servicosRes.data || [])
      setProfissionais(profissionaisRes.data || [])
    } catch (error) {
      console.error("Erro ao carregar base de agendamentos:", error)
      setAviso({
        titulo: "Atenção",
        mensagem: "Não foi possível carregar clientes e serviços. Tente recarregar a página."
      })
    }
  }
 
  const carregarAgendamentos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFiltro) params.append("status", statusFiltro)
      if (dataInicio) params.append("dataInicio", dataInicio)
      if (dataFim) {
        const fim = new Date(dataFim)
        fim.setHours(23, 59, 59, 999)
        params.append("dataFim", fim.toISOString())
      }
      if (profissionalFiltro) params.append("profissionalId", profissionalFiltro)
      if (clienteFiltro) params.append("clienteId", clienteFiltro)
      const response = await api.get(`/agendamentos?${params.toString()}`)
      setAgendamentos(response.data || [])
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error)
    } finally {
      setLoading(false)
    }
  }

  const resumo = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    return {
      total: agendamentos.length,
      agendados: agendamentos.filter((a) => a.status === "agendado").length,
      concluidos: agendamentos.filter((a) => a.status === "concluido").length,
      hoje: agendamentos.filter(
        (a) => a.dataHora && new Date(a.dataHora).toISOString().slice(0, 10) === hoje
      ).length
    }
  }, [agendamentos])

  const obterProfissionalPadrao = () => {
    if (
      usuarioLogado?.profissional === true &&
      usuarioLogado?.preSelecionarAgendamento === true &&
      usuarioLogado?.id
    ) {
      return String(usuarioLogado.id)
    }

    return ""
  }

  /* ============== AÇÕES ============== */
  const abrirNovoAgendamento = (dataPreenchida = null) => {
    const profissionalPadrao = obterProfissionalPadrao()
    setModoEdicao(false)
    setAgendamentoEditandoId(null)
    setForm({
      clienteId: "",
      clienteNome: "",
      servicoId: "",
      profissionalId: profissionalPadrao,
      titulo: "",
      descricao: "",
      dataHora: dataPreenchida ? formatarDataHoraInput(dataPreenchida) : "",
      status: "agendado",
      observacoes: ""
    })
    setMostrarModal(true)
  }

  const abrirEditarAgendamento = (agendamento) => {
    setAgendamentoSelecionado(null)
    setModoEdicao(true)
    setAgendamentoEditandoId(agendamento.id)
    setForm({
      clienteId: agendamento.clienteId ? String(agendamento.clienteId) : "",
      clienteNome: agendamento.cliente?.nome || "",
      servicoId: agendamento.servicoId ? String(agendamento.servicoId) : "",
      profissionalId: agendamento.profissionalId ? String(agendamento.profissionalId) : "",
      titulo: agendamento.titulo || "",
      descricao: agendamento.descricao || "",
      dataHora: formatarDataHoraInput(agendamento.dataHora),
      status: agendamento.status || "agendado",
      observacoes: agendamento.observacoes || ""
    })
    setMostrarModal(true)
  }

  const salvarAgendamento = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setAviso({ titulo: "Atenção", mensagem: "Informe o título do agendamento." })
      return
    }
    if (!form.dataHora) {
      setAviso({ titulo: "Atenção", mensagem: "Informe a data e hora do agendamento." })
      return
    }
    if (!form.profissionalId) {
      setAviso({ titulo: "Atenção", mensagem: "Informe o profissional do agendamento." })
      return
    }
    try {
      setSalvando(true)
      const payload = {
        clienteId: form.clienteId ? Number(form.clienteId) : null,
        servicoId: form.servicoId ? Number(form.servicoId) : null,
        profissionalId: form.profissionalId ? Number(form.profissionalId) : null,
        titulo: form.titulo,
        descricao: form.descricao || null,
        dataHora: form.dataHora,
        observacoes: form.observacoes || null
      }
      if (form.status !== "concluido") {
        payload.status = form.status
      }
      if (modoEdicao) {
        await api.put(`/agendamentos/${agendamentoEditandoId}`, payload)
      } else {
        await api.post("/agendamentos", payload)
      }
      setMostrarModal(false)
      carregarAgendamentos()
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao salvar agendamento"
      })
    } finally {
      setSalvando(false)
    }
  }

 const abrirConclusaoAgendamento = (agendamento) => {
  const valor = Number(
    agendamento.valorServico || agendamento.servico?.preco || 0
  )

  setAgendamentoConcluir(agendamento)
  setFormConclusao({
    valorPago: valor ? String(valor) : "",
    formaPagamento: "",
    fiado: false,
    vencimento: "",
    observacoesPagamento: ""
  })

  setMostrarModalConclusao(true)
}

  const atualizarStatus = async (agendamento, novoStatus) => {
    if (novoStatus === "concluido") {
      abrirConclusaoAgendamento(agendamento)
      return
    }

    try {
      await api.put(`/agendamentos/${agendamento.id}`, { status: novoStatus })
      setAgendamentoSelecionado(null)
      carregarAgendamentos()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      setAviso({
        titulo: "Erro",
        mensagem: error.response?.data?.error || "Erro ao atualizar status"
      })
    }
  }

  const concluirAgendamento = async (e) => {
    e.preventDefault()

    if (!agendamentoConcluir) return

    const valorPagoNumero = Number(formConclusao.valorPago || 0)

    if (valorPagoNumero < 0) {
      setAviso({
        titulo: "Atenção",
        mensagem: "O valor pago não pode ser negativo."
      })
      return
    }

    if (valorPagoNumero > 0 && !formConclusao.formaPagamento) {
      setAviso({
        titulo: "Atenção",
        mensagem: "Informe a forma de pagamento."
      })
      return
    }

    try {
      setSalvando(true)

      await api.post(`/agendamentos/${agendamentoConcluir.id}/concluir`, {
        valorPago: valorPagoNumero,
        formaPagamento: formConclusao.formaPagamento || null,
        fiado: formConclusao.fiado,
        vencimento: formConclusao.vencimento || null,
        observacoesPagamento: formConclusao.observacoesPagamento || null
      })

      setMostrarModalConclusao(false)
      setAgendamentoConcluir(null)
      setAgendamentoSelecionado(null)

      carregarAgendamentos()

      setAviso({
        titulo: "Sucesso",
        mensagem: "Agendamento concluído e venda registrada com sucesso!"
      })
    } catch (error) {
      console.error("Erro ao concluir agendamento:", error)

      setAviso({
        titulo: "Erro",
        mensagem:
          error.response?.data?.error ||
          "Erro ao concluir agendamento"
      })
    } finally {
      setSalvando(false)
    }
  }

  const excluirAgendamento = (id) => {
    setAviso({
      titulo: "Excluir agendamento",
      mensagem: "Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.",
      tipo: "confirmacao",
      labelConfirmar: "Excluir",
      corConfirmar: "bg-red-600",
      onConfirmar: async () => {
        try {
          await api.delete(`/agendamentos/${id}`)
          setAviso(null)
          setAgendamentoSelecionado(null)
          carregarAgendamentos()
        } catch (error) {
          console.error("Erro ao excluir agendamento:", error)
          setAviso({
            titulo: "Erro",
            mensagem: error.response?.data?.error || "Erro ao excluir agendamento"
          })
        }
      }
    })
  }

  const limparFiltros = () => {
    setStatusFiltro("")
    setDataInicio("")
    setDataFim("")
    setProfissionalFiltro("")
    setClienteFiltro("")
    setClienteFiltroNome("")
    setVisao("semana")
  }

  /* ============== NAVEGAÇÃO DE DATAS ============== */
  const navegar = (delta) => {
    const nova = new Date(dataReferencia)
    if (visao === "mes") nova.setMonth(nova.getMonth() + delta)
    else if (visao === "semana") nova.setDate(nova.getDate() + 7 * delta)
    else if (visao === "dia") nova.setDate(nova.getDate() + delta)
    setDataReferencia(nova)
  }
  const irParaHoje = () => setDataReferencia(new Date())

  const tituloPeriodo = useMemo(() => {
    const opt = { month: "long", year: "numeric" }
    if (visao === "mes") {
      return capitalizar(dataReferencia.toLocaleDateString("pt-BR", opt))
    }
    if (visao === "semana") {
      const ini = inicioSemana(dataReferencia)
      const fim = new Date(ini); fim.setDate(ini.getDate() + 6)
      return `${ini.getDate()} ${ini.toLocaleDateString("pt-BR", { month: "short" })} – ${fim.getDate()} ${fim.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`
    }
    if (visao === "dia") {
      return capitalizar(dataReferencia.toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
      }))
    }
    return "Lista de agendamentos"
  }, [visao, dataReferencia])

  const servicoSelecionado = servicos.find(
    (servico) => String(servico.id) === String(form.servicoId)
  )

  const valorServicoSelecionado = servicoSelecionado?.preco || 0

  return (
    <AppLayout>
      {/* Container fixo na viewport — sem scroll na página */}
      <div className="h-[calc(100vh-2rem)] flex flex-col gap-3 overflow-hidden">

        {/* ===== Linha 1: Header + KPIs compactos + CTA ===== */}
        <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#2D2E47] leading-tight">Agendamentos</h1>
              <p className="text-xs text-gray-500">Clique num horário para criar.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
              <KpiInline label="Total" valor={resumo.total} cor="text-blue-600" />
              <KpiInline label="Agendados" valor={resumo.agendados} cor="text-amber-600" />
              <KpiInline label="Concluídos" valor={resumo.concluidos} cor="text-emerald-600" />
              <KpiInline label="Hoje" valor={resumo.hoje} cor="text-violet-600" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => abrirNovoAgendamento()}
            className="bg-[#2F8AA3] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm"
          >
            + Novo Agendamento
          </button>
        </div>

        {/* ===== Linha 2: Toolbar única (navegação + visão + filtros + legenda) ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Navegação */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={irParaHoje}
                className="h-8 px-2.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
              >Hoje</button>
              <button
                onClick={() => navegar(-1)}
                className="h-8 w-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Anterior"
              >‹</button>
              <button
                onClick={() => navegar(1)}
                className="h-8 w-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Próximo"
              >›</button>
              <h2 className="ml-1 text-sm font-semibold text-[#2D2E47] min-w-[150px]">{tituloPeriodo}</h2>
            </div>

            {/* Visões */}
            <div className="flex h-8 items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {[
                { v: "mes", l: "Mês" },
                { v: "semana", l: "Semana" },
                { v: "dia", l: "Dia" },
                { v: "lista", l: "Lista" }
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setVisao(o.v)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition ${
                    visao === o.v ? "bg-white text-[#2F8AA3] shadow-sm" : "text-gray-600 hover:text-gray-800"
                  }`}
                >{o.l}</button>
              ))}
            </div>

            {/* Filtros status */}
            <div className="flex h-8 items-center gap-1.5">
              {[
                { label: "Todos", value: "" },
                { label: "Agendados", value: "agendado" },
                { label: "Concluídos", value: "concluido" },
                { label: "Cancelados", value: "cancelado" }
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFiltro(f.value)}
                  className={`h-8 px-2.5 rounded-full text-xs font-medium transition ${
                    statusFiltro === f.value
                      ? "bg-[#2F8AA3] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >{f.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={profissionalFiltro}
              onChange={(e) => setProfissionalFiltro(e.target.value)}
              className="h-9 w-48 bg-white border border-gray-200 rounded-lg px-3 text-xs text-[#2D2E47] outline-none focus:ring-2 focus:ring-[#3E7996]"
            >
              <option value="">Todos os profissionais</option>

              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>

            <div className="w-48">
              <ClienteSearchSelect
                clientes={clientes}
                clienteId={clienteFiltro}
                setClienteId={(id) => {
                  setClienteFiltro(id)

                  if (!id){
                    setClienteFiltroNome("")
                    setVisao("semana")                
                  }
                }}
                buscaInicial={clienteFiltroNome}
                placeholder="Buscar cliente"
                permitirSemCliente={true}
                inputClassName="h-9 w-full border border-gray-200 rounded-lg px-3 text-xs text-[#2D2E47] outline-none focus:ring-2 focus:ring-[#3E7996]"
                onSelect={(cliente) => {
                  setClienteFiltro(String(cliente.id))
                  setClienteFiltroNome(cliente.nome)
                  setVisao("lista")
                }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-9 w-36 bg-white border border-gray-200 rounded-lg px-3 text-xs text-[#2D2E47] outline-none focus:ring-2 focus:ring-[#3E7996]"
              />

              <span className="text-xs text-gray-400">→</span>
              
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9 w-36 bg-white border border-gray-200 rounded-lg px-3 text-xs text-[#2D2E47] outline-none focus:ring-2 focus:ring-[#3E7996]"
              />
            </div>

            <button
              type="button"
              onClick={limparFiltros}
              className="h-9 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs"
            >Limpar</button>

            {/* Legenda inline */}
            <div className="hidden xl:flex h-9 items-center gap-3 pl-3 ml-auto border-l border-gray-200 text-[11px] text-gray-500">
              <Legenda cor="bg-[#2F8AA3]" texto="Agendado" />
              <Legenda cor="bg-emerald-500" texto="Concluído" />
              <Legenda cor="bg-rose-400" texto="Cancelado" />
              <Legenda cor="bg-amber-400" texto="Feriado" />
            </div>
          </div>
        </div>


        {/* ===== Linha 3: Calendário ocupa todo o resto da viewport ===== */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-500">
              Carregando agenda...
            </div>
          ) : (
            <>
              {visao === "mes" && (
                <VisaoMes
                  dataReferencia={dataReferencia}
                  agendamentos={agendamentos}
                  onClickEvento={(a) => setAgendamentoSelecionado(a)}
                  onClickDia={(d) => abrirNovoAgendamento(d)}
                  onIrParaDia={(d) => { setDataReferencia(d); setVisao("dia") }}
                />
              )}
              {visao === "semana" && (
                <VisaoSemana
                  dataReferencia={dataReferencia}
                  agendamentos={agendamentos}
                  onClickEvento={(a) => setAgendamentoSelecionado(a)}
                  onClickSlot={(d) => abrirNovoAgendamento(d)}
                />
              )}
              {visao === "dia" && (
                <VisaoDia
                  dataReferencia={dataReferencia}
                  agendamentos={agendamentos}
                  onClickEvento={(a) => setAgendamentoSelecionado(a)}
                  onClickSlot={(d) => abrirNovoAgendamento(d)}
                />
              )}
              {visao === "lista" && (
                <VisaoLista
                  agendamentos={agendamentos}
                  onEditar={abrirEditarAgendamento}
                  onAtualizarStatus={atualizarStatus}
                  onExcluir={excluirAgendamento}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Popover/modal de detalhes ao clicar num evento */}
      {agendamentoSelecionado && (
        <Modal
          titulo="Detalhes do agendamento"
          onClose={() => setAgendamentoSelecionado(null)}
        >
          <DetalhesAgendamento
            agendamento={agendamentoSelecionado}
            onEditar={() => abrirEditarAgendamento(agendamentoSelecionado)}
            onAtualizarStatus={atualizarStatus}
            onExcluir={() => excluirAgendamento(agendamentoSelecionado.id)}
          />
        </Modal>
      )}

      {/* Modal de criação/edição */}
      {mostrarModal && (
        <Modal
          titulo={modoEdicao ? "Editar Agendamento" : "Novo Agendamento"}
          onClose={() => setMostrarModal(false)}
        >
          <form onSubmit={salvarAgendamento} className="space-y-4">
            <CampoInput
              label="Título *"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Banho e tosa"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[#2D2E47] mb-2">Cliente</label>
              <ClienteSearchSelect
                clientes={clientes}
                clienteId={form.clienteId}
                setClienteId={(id) =>
                  setForm({
                    ...form,
                    clienteId: id,
                    clienteNome: ""
                  })
                }
                buscaInicial={form.clienteNome}
                placeholder="Digite o nome do cliente"
                permitirSemCliente={true}
                onSelect={(cliente) =>
                  setForm({
                    ...form,
                    clienteId: String(cliente.id),
                    clienteNome: cliente.nome
                  })
                }
              />
            </div>
            <CampoSelect
              label="Profissional *"
              value={form.profissionalId}
              onChange={(e) =>
                setForm({
                  ...form,
                  profissionalId: e.target.value
                })
              }
              options={[
                { value: "", label: "Selecione um profissional" },
                ...profissionais.map((profissional) => ({
                  value: String(profissional.id),
                  label: `${profissional.nome}${
                    profissional.cargo ? ` - ${profissional.cargo}` : ""
                  }`
                }))
              ]}
            />
            <CampoSelect
              label="Serviço"
              value={form.servicoId}
              onChange={(e) => {
                const servico = servicos.find(
                  (item) => String(item.id) === String(e.target.value)
                )

                setForm({
                  ...form,
                  servicoId: e.target.value,
                  titulo: !form.titulo && servico ? servico.nome : form.titulo
                })
              }}
              options={[
                { value: "", label: "Sem serviço" },
                ...servicos.map((servico) => ({
                  value: String(servico.id),
                  label: `${servico.nome} - ${formatarMoeda(servico.preco)}`
                }))
              ]}
            />

            {form.servicoId && (
              <div className="bg-[#2F8AA3]/10 border border-[#2F8AA3]/20 rounded-xl p-4">
                <p className="text-sm text-gray-500">
                  Valor do serviço selecionado
                </p>

                <p className="text-2xl font-bold text-[#2D2E47] mt-1">
                  {formatarMoeda(valorServicoSelecionado)}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Esse valor será salvo no agendamento.
                </p>
              </div>
            )}

            <CampoInput
              label="Data e hora *"
              type="datetime-local"
              value={form.dataHora}
              onChange={(e) => setForm({ ...form, dataHora: e.target.value })}
              required
            />
            <CampoSelect
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              disabled={form.status === "concluido"}
              options={[
                { value: "agendado", label: "Agendado" },
                ...(form.status === "concluido"
                  ? [{ value: "concluido", label: "Concluído" }]
                  : []),
                { value: "cancelado", label: "Cancelado" }
              ]}
            />
            <CampoTextarea
              label="Descrição"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes do atendimento"
            />
            <CampoTextarea
              label="Observações"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações internas"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >Cancelar</button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-50"
              >{salvando ? "Salvando..." : "Salvar Agendamento"}</button>
            </div>
          </form>
        </Modal>
      )}

      {mostrarModalConclusao && agendamentoConcluir && (
        <Modal
          titulo="Concluir agendamento"
          onClose={() => {
            setMostrarModalConclusao(false)
            setAgendamentoConcluir(null)
          }}
        >
          <form onSubmit={concluirAgendamento} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Atendimento</p>
              <p className="font-semibold text-[#2D2E47] mt-1">
                {agendamentoConcluir.titulo}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <InfoBox
                  label="Cliente"
                  valor={agendamentoConcluir.cliente?.nome || "Sem cliente"}
                />

                <InfoBox
                  label="Serviço"
                  valor={agendamentoConcluir.servico?.nome || "Sem serviço"}
                />

                <InfoBox
                  label="Profissional"
                  valor={agendamentoConcluir.profissional?.nome || "-"}
                />

                <InfoBox
                  label="Valor"
                  valor={formatarMoeda(
                    agendamentoConcluir.valorServico ||
                      agendamentoConcluir.servico?.preco ||
                      0
                  )}
                />
              </div>
            </div>

            <CampoInput
              label="Valor pago agora"
              type="number"
              value={formConclusao.valorPago}
              onChange={(e) =>
                setFormConclusao({
                  ...formConclusao,
                  valorPago: e.target.value
                })
              }
              placeholder="0,00"
            />

            <CampoSelect
              label="Forma de pagamento"
              value={formConclusao.formaPagamento}
              onChange={(e) =>
                setFormConclusao({
                  ...formConclusao,
                  formaPagamento: e.target.value
                })
              }
              options={[
                { value: "", label: "Selecione" },
                { value: "dinheiro", label: "Dinheiro" },
                { value: "pix", label: "Pix" },
                { value: "cartao_debito", label: "Cartão de débito" },
                { value: "cartao_credito", label: "Cartão de crédito" }
              ]}
            />

            <label className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={formConclusao.fiado}
                onChange={(e) => {
                  const fiado = e.target.checked
                  const valor = Number(
                    agendamentoConcluir.valorServico ||
                      agendamentoConcluir.servico?.preco ||
                      0
                  )

                  setFormConclusao({
                    ...formConclusao,
                    fiado,
                    valorPago: fiado ? "" : valor ? String(valor) : "",
                    formaPagamento: fiado ? "" : formConclusao.formaPagamento
                  })
                }}
              />

              Deixar saldo em aberto / cliente vai pagar depois
            </label>

            {formConclusao.fiado && (
              <CampoInput
                label="Vencimento"
                type="date"
                value={formConclusao.vencimento}
                onChange={(e) =>
                  setFormConclusao({
                    ...formConclusao,
                    vencimento: e.target.value
                  })
                }
              />
            )}

            <CampoTextarea
              label="Observação do pagamento"
              value={formConclusao.observacoesPagamento}
              onChange={(e) =>
                setFormConclusao({
                  ...formConclusao,
                  observacoesPagamento: e.target.value
                })
              }
              placeholder="Ex: pagamento parcial, combinado para fim do mês..."
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalConclusao(false)
                  setAgendamentoConcluir(null)
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? "Concluindo..." : "Concluir e registrar venda"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {aviso && <ModalAviso {...aviso} onClose={() => setAviso(null)} />}
    </AppLayout>
  )
}


function VisaoMes({ dataReferencia, agendamentos, onClickEvento, onClickDia, onIrParaDia }) {
  const dias = useMemo(() => gerarGridMes(dataReferencia), [dataReferencia])
  const hojeStr = new Date().toDateString()
  const mesAtual = dataReferencia.getMonth()

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 shrink-0">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 text-center uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
        {dias.map((dia, idx) => {
          const eventosDoDia = agendamentos
            .filter((a) => a.dataHora && mesmoDia(new Date(a.dataHora), dia))
            .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))
          const ehHoje = dia.toDateString() === hojeStr
          const foraDoMes = dia.getMonth() !== mesAtual
          const feriado = obterFeriado(dia)

          return (
            <div
              key={idx}
              className={`group relative border-b border-r border-gray-100 p-1.5 cursor-pointer transition ${
                foraDoMes
                  ? "bg-gray-50/40"
                  : feriado
                    ? "bg-amber-50/70 hover:bg-amber-50"
                    : "bg-white hover:bg-[#F4FAFC]"
              }`}
              onClick={() => onClickDia(dia)}
            >
              <div className="flex items-center justify-between px-1 mb-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onIrParaDia(dia) }}
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition ${
                    ehHoje
                      ? "bg-[#2F8AA3] text-white"
                      : feriado && !foraDoMes
                        ? "bg-amber-400 text-white"
                      : foraDoMes
                        ? "text-gray-300"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >{dia.getDate()}</button>
                {eventosDoDia.length > 0 && (
                  <span className="text-[10px] text-gray-400">{eventosDoDia.length}</span>
                )}
              </div>
              {feriado && !foraDoMes && (
                <div
                  className="mb-1 truncate rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                  title={feriado.nome}
                >
                  {feriado.nome}
                </div>
              )}
              <div className="space-y-1">
                {eventosDoDia.slice(0, 3).map((a) => {
                  const cor = STATUS_CORES[a.status] || STATUS_CORES.agendado
                  return (
                    <button
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); onClickEvento(a) }}
                      className={`w-full text-left text-[11px] px-1.5 py-1 rounded-md truncate ${cor.bgSoft} ${cor.text} border-l-2 ${cor.border} hover:brightness-95`}
                      title={a.titulo}
                    >
                      <span className="font-medium">{horaCurta(a.dataHora)}</span>{" "}
                      {a.titulo}
                    </button>
                  )
                })}
                {eventosDoDia.length > 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onIrParaDia(dia) }}
                    className="text-[11px] text-[#2F8AA3] font-medium hover:underline px-1.5"
                  >+ {eventosDoDia.length - 3} mais</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function VisaoSemana({ dataReferencia, agendamentos, onClickEvento, onClickSlot }) {
  const ini = useMemo(() => inicioSemana(dataReferencia), [dataReferencia])
  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d }),
    [ini]
  )
  const horas = Array.from({ length: HORA_FINAL - HORA_INICIAL }, (_, i) => HORA_INICIAL + i)
  const hojeStr = new Date().toDateString()

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Header dias */}
      <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-gray-100 bg-gray-50 shrink-0">
        <div></div>
        {dias.map((d) => {
          const ehHoje = d.toDateString() === hojeStr
          const feriado = obterFeriado(d)
          return (
            <div key={d.toISOString()} className="px-2 py-1.5 text-center border-l border-gray-100">
              <div className="text-[10px] uppercase text-gray-500 font-medium">
                {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
              </div>
              <div className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                ehHoje
                  ? "bg-[#2F8AA3] text-white"
                  : feriado
                    ? "bg-amber-400 text-white"
                    : "text-[#2D2E47]"
              }`}>{d.getDate()}</div>
              {feriado && (
                <div
                  className="mx-auto mt-1 max-w-full truncate text-[10px] font-semibold text-amber-700"
                  title={feriado.nome}
                >
                  {feriado.nome}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Grid horas — único elemento com scroll */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-[50px_repeat(7,1fr)]">
          {horas.map((h) => (
            <FragmentoHora
              key={h}
              hora={h}
              dias={dias}
              agendamentos={agendamentos}
              onClickEvento={onClickEvento}
              onClickSlot={onClickSlot}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FragmentoHora({ hora, dias, agendamentos, onClickEvento, onClickSlot }) {
  return (
    <>
      <div className="min-h-10 border-t border-gray-100 text-[11px] text-gray-400 px-2 pt-1 text-right">
        {String(hora).padStart(2, "0")}:00
      </div>
      {dias.map((d) => {
        const slot = new Date(d); slot.setHours(hora, 0, 0, 0)
        const feriado = obterFeriado(d)
        const eventos = agendamentos.filter((a) => {
          if (!a.dataHora) return false
          const dt = new Date(a.dataHora)
          return mesmoDia(dt, d) && dt.getHours() === hora
        })
        return (
          <div
            key={d.toISOString() + hora}
            onClick={() => onClickSlot(slot)}
            className={`relative min-h-2 border-t border-l border-gray-100 cursor-pointer transition ${
              feriado ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-[#F4FAFC]"
            }`}
          >
            <div className="inset-1 flex flex-col">
              {eventos.map((a) => {
                const cor = STATUS_CORES[a.status] || STATUS_CORES.agendado
                return (
                  <button
                    key={a.id}
                    onClick={(e) => { e.stopPropagation(); onClickEvento(a) }}
                    className={`flex-1 min-h-2 m-[3px] text-left rounded-md px-1.5 py-1 text-[11px] ${cor.bgSoft} ${cor.text} border-l-[3px] ${cor.border} hover:brightness-95 overflow-hidden`}
                  >
                    <div className="font-semibold truncate">{a.titulo}</div>
                    <div className="truncate opacity-75">{horaCurta(a.dataHora)} · {a.cliente?.nome || "—"}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}


function VisaoDia({ dataReferencia, agendamentos, onClickEvento, onClickSlot }) {
  const horas = Array.from({ length: HORA_FINAL - HORA_INICIAL }, (_, i) => HORA_INICIAL + i)
  const eventosDoDia = agendamentos
    .filter((a) => a.dataHora && mesmoDia(new Date(a.dataHora), dataReferencia))
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))
  const feriado = obterFeriado(dataReferencia)

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="text-lg font-bold text-[#2D2E47]">
            {dataReferencia.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </h3>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
            {dataReferencia.toLocaleDateString("pt-BR", { weekday: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {feriado && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {feriado.nome}
            </span>
          )}
          <span className="text-xs text-gray-500">{eventosDoDia.length} agendamento(s)</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-[70px_1fr]">
          {horas.map((h) => {
            const slot = new Date(dataReferencia); slot.setHours(h, 0, 0, 0)
            const eventos = eventosDoDia.filter((a) => new Date(a.dataHora).getHours() === h)
            return (
              <FragmentoHoraDia
                key={h}
                hora={h}
                slot={slot}
                eventos={eventos}
                onClickEvento={onClickEvento}
                onClickSlot={onClickSlot}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FragmentoHoraDia({ hora, slot, eventos, onClickEvento, onClickSlot }) {
  const feriado = obterFeriado(slot)

  return (
    <>
      <div 
        onClick={() => onClickSlot(slot)}
        className={`border-t min-h-20 border-gray-100 text-xs text-gray-400 px-3 pt-1 text-right cursor-pointer ${
          feriado ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-[#F4FAFC]"
        }`}>
        
        {String(hora).padStart(2, "0")}:00
      </div>
      <div
        onClick={() => onClickSlot(slot)}
        className={`relative min-h-20 border-t border-l border-gray-100 cursor-pointer transition px-2 py-1 ${
          feriado ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-[#F4FAFC]"
        }`}
      >
        <div className="flex flex-col gap-1.5 h-full">
          {eventos.map((a) => {
            const cor = STATUS_CORES[a.status] || STATUS_CORES.agendado
            return (
              <button
                key={a.id}
                onClick={(e) => { e.stopPropagation(); onClickEvento(a) }}
                className={`text-left rounded-lg px-3 py-2 ${cor.bgSoft} ${cor.text} border-l-4 ${cor.border} hover:brightness-95 transition`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{a.titulo}</p>
                    <p className="text-xs opacity-80 truncate">
                      {horaCurta(a.dataHora)} · {a.cliente?.nome || "Sem cliente"}
                      {a.servico?.nome ? ` · ${a.servico.nome}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 w-2 h-2 rounded-full ${cor.dot}`}></span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}


function VisaoLista({ agendamentos, onEditar, onAtualizarStatus, onExcluir }) {
  const grupos = useMemo(() => {
    const map = new Map()
    ;[...agendamentos]
      .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))
      .forEach((a) => {
        const k = a.dataHora ? new Date(a.dataHora).toDateString() : "sem-data"
        if (!map.has(k)) map.set(k, [])
        map.get(k).push(a)
      })
    return Array.from(map.entries())
  }, [agendamentos])

  if (agendamentos.length === 0) {
    return (
      <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-500">
        Nenhum agendamento encontrado.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto pr-1 space-y-4">
      {grupos.map(([dataStr, lista]) => {
        const data = dataStr === "sem-data" ? null : new Date(dataStr)
        const feriado = data ? obterFeriado(data) : null
        return (
          <div key={dataStr} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${
                feriado ? "bg-amber-100 text-amber-700" : "bg-[#E6F2F6] text-[#2F8AA3]"
              }`}>
                <span className="text-[10px] font-semibold uppercase">
                  {data ? data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : "—"}
                </span>
                <span className="text-sm font-bold leading-none">
                  {data ? data.getDate() : "?"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[#2D2E47]">
                  {data ? capitalizar(data.toLocaleDateString("pt-BR", { weekday: "long" })) : "Sem data"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-gray-500">{lista.length} agendamento(s)</p>
                  {feriado && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      {feriado.nome}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {lista.map((a) => {
                const cor = STATUS_CORES[a.status] || STATUS_CORES.agendado
                return (
                  <div key={a.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-gray-50 transition">
                    <div className={`w-1 self-stretch rounded-full ${cor.bg} hidden md:block`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#2D2E47]">{horaCurta(a.dataHora)}</span>
                        <span className="text-[#2D2E47]">{a.titulo}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {(a.cliente?.nome || "Sem cliente")}
                        {a.profissional?.nome ? ` · ${a.profissional.nome}` : ""}
                        {a.servico?.nome ? ` · ${a.servico.nome}` : ""}
                        {a.valorServico ? ` · ${formatarMoeda(a.valorServico)}` : ""}
                        {a.descricao ? ` · ${a.descricao}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.status === "agendado" && (
                        <>
                          <button
                            onClick={() => onAtualizarStatus(a, "concluido")}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          >Concluir</button>
                          <button
                            onClick={() => onAtualizarStatus(a, "cancelado")}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >Cancelar</button>
                        </>
                      )}
                      <button
                        onClick={() => onEditar(a)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                      >Editar</button>
                      <button
                        onClick={() => onExcluir(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >Excluir</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}


function DetalhesAgendamento({ agendamento, onEditar, onAtualizarStatus, onExcluir }) {
  const cor = STATUS_CORES[agendamento.status] || STATUS_CORES.agendado
  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-4 ${cor.bgSoft} border-l-4 ${cor.border}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className={`text-lg font-bold ${cor.text}`}>{agendamento.titulo}</h3>
          <StatusBadge status={agendamento.status} />
        </div>
        <p className="text-sm text-gray-700 mt-1">
          📅 {formatarDataHora(agendamento.dataHora)}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoBox label="Cliente" valor={agendamento.cliente?.nome || "Sem cliente"} />
        <InfoBox label="Profissional" valor={agendamento.profissional?.nome || "Sem profissional"} />
        <InfoBox label="Serviço" valor={agendamento.servico?.nome || "Sem serviço"} />
        <InfoBox label="Valor" valor={agendamento.valorServico ? formatarMoeda(agendamento.valorServico): "-"} />
        <InfoBox label="Venda vinculada" valor={agendamento.vendaId ? `Venda #${agendamento.vendaId}` : "Ainda não gerou venda"} />
        <InfoBox label="Criado em" valor={formatarData(agendamento.createdAt)} />
        <InfoBox label="Status" valor={capitalizar(agendamento.status)} />
      </div>

      {agendamento.descricao && (
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Descrição</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{agendamento.descricao}</p>
        </div>
      )}
      {agendamento.observacoes && (
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Observações</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{agendamento.observacoes}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-100">
        {agendamento.status === "agendado" && (
          <>
            <button
              onClick={() => onAtualizarStatus(agendamento, "concluido")}
              className="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-sm"
            >Concluir</button>
            <button
              onClick={() => onAtualizarStatus(agendamento, "cancelado")}
              className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm"
            >Cancelar</button>
          </>
        )}
        <button
          onClick={onEditar}
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
        >Editar</button>
        <button
          onClick={onExcluir}
          className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm"
        >Excluir</button>
      </div>
    </div>
  )
}

function InfoBox({ label, valor }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="text-sm font-medium text-[#2D2E47] mt-0.5 truncate">{valor}</p>
    </div>
  )
}


function FiltroBotao({ ativo, texto, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
        ativo ? "bg-[#2F8AA3] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >{texto}</button>
  )
}

function KpiInline({ label, valor, cor }) {
  return (
    <div className="flex items-baseline gap-1.5 px-2">
      <span className={`text-lg font-bold ${cor}`}>{valor}</span>
      <span className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function Legenda({ cor, texto }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${cor}`}></span>
      {texto}
    </span>
  )
}

function formatarDataHoraInput(data) {
  if (!data) return ""
  const dataObj = data instanceof Date ? data : new Date(data)
  const offset = dataObj.getTimezoneOffset()
  const local = new Date(dataObj.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function inicioSemana(data) {
  const d = new Date(data)
  const dia = d.getDay() // 0=Dom
  d.setDate(d.getDate() - dia)
  d.setHours(0, 0, 0, 0)
  return d
}

function gerarGridMes(data) {
  const ini = new Date(data.getFullYear(), data.getMonth(), 1)
  const inicio = inicioSemana(ini)
  // 6 semanas (42 dias) garante grid completo
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d
  })
}

function mesmoDia(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function horaCurta(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const feriadosPorAno = new Map()

function obterFeriado(data) {
  if (!data) return null

  const feriados = listarFeriadosBrasil(data.getFullYear())
  return feriados.get(chaveData(data)) || null
}

function listarFeriadosBrasil(ano) {
  if (feriadosPorAno.has(ano)) {
    return feriadosPorAno.get(ano)
  }

  const pascoa = calcularPascoa(ano)
  const feriados = [
    { data: new Date(ano, 0, 1), nome: "Confraternização Universal" },
    { data: adicionarDias(pascoa, -48), nome: "Carnaval" },
    { data: adicionarDias(pascoa, -47), nome: "Carnaval" },
    { data: adicionarDias(pascoa, -2), nome: "Sexta-feira Santa" },
    { data: pascoa, nome: "Páscoa" },
    { data: new Date(ano, 3, 21), nome: "Tiradentes" },
    { data: new Date(ano, 4, 1), nome: "Dia do Trabalho" },
    { data: adicionarDias(pascoa, 60), nome: "Corpus Christi" },
    { data: new Date(ano, 8, 7), nome: "Independência do Brasil" },
    { data: new Date(ano, 9, 12), nome: "Nossa Senhora Aparecida" },
    { data: new Date(ano, 10, 2), nome: "Finados" },
    { data: new Date(ano, 10, 15), nome: "Proclamação da República" },
    { data: new Date(ano, 10, 20), nome: "Consciência Negra" },
    { data: new Date(ano, 11, 25), nome: "Natal" }
  ]

  const mapa = new Map(
    feriados.map((feriado) => [
      chaveData(feriado.data),
      { ...feriado, data: chaveData(feriado.data) }
    ])
  )

  feriadosPorAno.set(ano, mapa)
  return mapa
}

function chaveData(data) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0")
  ].join("-")
}

function adicionarDias(data, dias) {
  const novaData = new Date(data)
  novaData.setDate(novaData.getDate() + dias)
  return novaData
}

function calcularPascoa(ano) {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(ano, mes - 1, dia)
}

function capitalizar(s) {
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}
