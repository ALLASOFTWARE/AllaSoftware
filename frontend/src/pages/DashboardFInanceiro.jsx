import { createElement, useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
  Wallet
} from "lucide-react"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts"
import { formatarMoeda, formatarFormaPagamento } from "../utils/formatters"

/**
 * Dashboard Financeiro — versão compacta.
 * KPIs menores agrupados por contexto (Resultado, Operação, Vendas),
 * gráficos preservados (Recharts) e seções com hierarquia clara.
 */
export default function DashboardFinanceiro() {
  const usuario = useMemo(
    () => JSON.parse(localStorage.getItem("usuario") || "null"),
    []
  )
  const [dados, setDados] = useState(null)
  const [profissionais, setProfissionais] = useState([])
  const [profissionalId, setProfissionalId] = useState(
    usuario?.role === "admin" ? "empresa" : String(usuario?.id || "")
  )
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState("mes") // hoje | 7d | mes

  const carregarProfissionais = useCallback(async () => {
    try {
      const response = await api.get("/profissionais")
      setProfissionais(response.data || [])
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error)
    }
  }, [])

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}

      if (profissionalId && profissionalId !== "empresa") {
        params.profissionalId = profissionalId
      }

      const response = await api.get("/dashboard/financeiro", { params })
      setDados(response.data)
    } catch (error) {
      console.error("Erro ao carregar dashboard financeiro:", error)
    } finally {
      setLoading(false)
    }
  }, [profissionalId])

  useEffect(() => {
    if (usuario?.role === "admin") {
      carregarProfissionais()
    }
  }, [carregarProfissionais, usuario?.role])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const formatarDataCurta = (data) => {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })
  }

  const grafico7Dias = useMemo(
    () =>
      (dados?.grafico7Dias || []).map((item) => ({
        ...item,
        diaFormatado: formatarDataCurta(item.dia),
      })),
    [dados]
  )

  const formasPagamento = useMemo(
    () =>
      Object.entries(dados?.formasPagamento || {}).map(([nome, valor]) => ({
        nome: formatarFormaPagamento(nome),
        valor,
      })),
    [dados]
  )

  // Bloco "Resultado" muda conforme período selecionado
  const resultado = useMemo(() => {
    if (!dados) return {}
    if (periodo === "hoje") return dados.hoje || {}
    if (periodo === "7d") return dados.seteDias || {}
    return dados.mes || {}
  }, [dados, periodo])

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-72 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-72 bg-gray-100 rounded-2xl" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Header compacto + seletor de período */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D2E47]">
            Dashboard Financeiro
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {dados?.escopo?.tipo === "profissional"
              ? `Visão de ${dados?.escopo?.profissional?.nome || "profissional"}`
              : "Entradas, saídas, lucro, cobranças e formas de pagamento."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {usuario?.role === "admin" && (
            <select
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-[#2D2E47] shadow-sm outline-none focus:ring-2 focus:ring-[#2F8AA3]/30 sm:w-auto"
            >
              <option value="empresa">Empresa geral</option>
              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
          )}

          <PeriodoSwitch value={periodo} onChange={setPeriodo} />
        </div>
      </div>

      {/* Resultado por período */}
      <SectionTitle>
        Resultado •{" "}
        {periodo === "hoje" ? "Hoje" : periodo === "7d" ? "7 dias" : "Mês"}
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi
          label="Lucro"
          value={formatarMoeda(resultado?.saldoCaixa)}
          tone="primary"
          Icon={Wallet}
        />
        <Kpi
          label="Entradas"
          value={formatarMoeda(resultado?.entradas)}
          tone="success"
          Icon={ArrowDownLeft}
        />
        <Kpi
          label="Saídas"
          value={formatarMoeda(resultado?.saidas)}
          tone="danger"
          Icon={ArrowUpRight}
        />
        <Kpi
          label="Em aberto"
          value={formatarMoeda(dados?.totalEmAberto)}
          tone="warning"
          Icon={ReceiptText}
        />
      </div>

      {/* Vendas */}
      <SectionTitle className="mt-6">Vendas do mês</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Kpi
          label="Faturamento"
          value={formatarMoeda(dados?.mes?.faturamentoVendas)}
          tone="info"
          Icon={ShoppingCart}
        />
        <Kpi
          label="Custo dos produtos"
          value={formatarMoeda(dados?.mes?.custoProdutosVendidos)}
          tone="muted"
          Icon={Package}
        />
        <Kpi
          label="Lucro bruto"
          value={formatarMoeda(dados?.mes?.lucroBrutoVendas)}
          tone="success"
          Icon={TrendingUp}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
        <Card className="xl:col-span-2" titulo="Entradas x Saídas — 7 dias">
          <div className="overflow-x-auto">
            <div className="h-[220px] min-w-[560px] sm:h-[240px] sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={grafico7Dias} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00BAB4" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00BAB4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="diaFormatado" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={56} />
              <Tooltip
                formatter={(v) => formatarMoeda(v)}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="#00BAB4"
                strokeWidth={2}
                fill="url(#gradIn)"
              />
              <Area
                type="monotone"
                dataKey="saidas"
                name="Saídas"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#gradOut)"
              />
            </AreaChart>
          </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card titulo="Formas de pagamento">
          {formasPagamento.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-500">
              Nenhum dado no mês.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="h-[220px] min-w-[460px] sm:h-[240px] sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formasPagamento} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={56} />
                <Tooltip
                  formatter={(v) => formatarMoeda(v)}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="valor"
                  name="Valor"
                  fill="#2F8AA3"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Transações + Cobranças */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <Card className="xl:col-span-2" titulo="Últimas transações" dense>
          {(dados?.ultimasTransacoes || []).length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-500">
              Nenhuma transação encontrada.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[280px] overflow-auto">
              {dados.ultimasTransacoes.map((t) => (
                <li
                  key={t.id}
                    className="px-4 py-3 sm:px-5 sm:py-2.5 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2D2E47] truncate">
                      {t.descricao || "Sem descrição"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {t.categoria || "Sem categoria"} •{" "}
                      {formatarFormaPagamento(t.formaPagamento)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      t.tipo === "entrada" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {t.tipo === "entrada" ? "+" : "−"} {formatarMoeda(t.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card titulo="Cobranças" dense>
          <div className="px-4 py-2 sm:px-5">
            <InfoLinha label="Pendentes" valor={dados?.contasPendentes || 0} />
            <InfoLinha label="Parciais" valor={dados?.contasParciais || 0} />
            <InfoLinha label="Pagas" valor={dados?.contasPagas || 0} />
            <InfoLinha label="Vencidas" valor={dados?.contasVencidas || 0} />
            <InfoLinha
              label="Total vencido"
              valor={formatarMoeda(dados?.totalVencido)}
              destaque
            />
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}

/* ---------- Subcomponentes ---------- */

function SectionTitle({ children, className = "" }) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 ${className}`}
    >
      {children}
    </h3>
  )
}

function PeriodoSwitch({ value, onChange }) {
  const opts = [
    { id: "hoje", label: "Hoje" },
    { id: "7d", label: "7d" },
    { id: "mes", label: "Mês" },
  ]
  return (
    <div className="grid grid-cols-3 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm sm:inline-flex">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === o.id
              ? "bg-[#2F8AA3] text-white shadow-sm"
              : "text-gray-600 hover:text-[#2D2E47]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const TONES = {
  primary: { icon: "bg-cyan-50 text-[#0891B2] border-cyan-100", value: "text-[#0B1437]" },
  success: { icon: "bg-emerald-50 text-emerald-600 border-emerald-100", value: "text-emerald-600" },
  danger: { icon: "bg-red-50 text-red-600 border-red-100", value: "text-red-600" },
  warning: { icon: "bg-amber-50 text-amber-600 border-amber-100", value: "text-amber-600" },
  info: { icon: "bg-sky-50 text-sky-600 border-sky-100", value: "text-cyan-700" },
  muted: { icon: "bg-gray-50 text-gray-600 border-gray-100", value: "text-gray-700" },
}

function Kpi({ label, value, hint, tone = "primary", Icon = TriangleAlert }) {
  const t = TONES[tone] || TONES.primary
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-3 min-h-20 flex items-start justify-between gap-3 sm:min-h-24 sm:p-4 sm:gap-4">
      <div className="min-w-0">
        <span className="text-xs font-medium text-[#4F5D75] leading-tight">
          {label}
        </span>
        <p className={`text-xl sm:text-2xl font-bold mt-1 leading-tight break-words ${t.value}`}>
          {value}
        </p>
        {hint && <p className="text-xs font-medium text-[#00AFA8] mt-2">{hint}</p>}
      </div>

      <div className={`h-9 w-9 shrink-0 rounded-full border flex items-center justify-center sm:h-10 sm:w-10 ${t.icon}`}>
        {createElement(Icon, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
      </div>
    </div>
  )
}

function Card({ titulo, children, className = "", dense = false }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-100 sm:px-5">
        <h2 className="text-sm font-semibold text-[#2D2E47]">{titulo}</h2>
      </div>
      <div className={dense ? "" : "p-3"}>{children}</div>
    </div>
  )
}

function InfoLinha({ label, valor, destaque = false }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold ${
          destaque ? "text-red-600" : "text-[#2D2E47]"
        }`}
      >
        {valor}
      </span>
    </div>
  )
}
