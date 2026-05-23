import { useCallback, useEffect, useMemo, useState } from "react"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        <div className="flex flex-wrap items-center gap-2">
          {usuario?.role === "admin" && (
            <select
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-[#2D2E47] shadow-sm outline-none focus:ring-2 focus:ring-[#2F8AA3]/30"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Lucro"
          value={formatarMoeda(resultado?.saldoCaixa)}
          tone="primary"
        />
        <Kpi
          label="Entradas"
          value={formatarMoeda(resultado?.entradas)}
          tone="success"
        />
        <Kpi
          label="Saídas"
          value={formatarMoeda(resultado?.saidas)}
          tone="danger"
        />
        <Kpi
          label="Em aberto"
          value={formatarMoeda(dados?.totalEmAberto)}
          tone="warning"
          hint={`${dados?.contasPendentes || 0} contas`}
        />
      </div>

      {/* Vendas */}
      <SectionTitle className="mt-6">Vendas do mês</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi
          label="Faturamento"
          value={formatarMoeda(dados?.mes?.faturamentoVendas)}
          tone="info"
        />
        <Kpi
          label="Custo dos produtos"
          value={formatarMoeda(dados?.mes?.custoProdutosVendidos)}
          tone="muted"
        />
        <Kpi
          label="Lucro bruto"
          value={formatarMoeda(dados?.mes?.lucroBrutoVendas)}
          tone="success"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
        <Card className="xl:col-span-2" titulo="Entradas x Saídas — 7 dias">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={grafico7Dias}>
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
        </Card>

        <Card titulo="Formas de pagamento">
          {formasPagamento.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-500">
              Nenhum dado no mês.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={formasPagamento}>
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
                  className="px-5 py-2.5 flex items-center justify-between gap-3"
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
          <div className="px-5 py-2">
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
    <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
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
  primary: { dot: "bg-[#2F8AA3]", value: "text-[#2D2E47]" },
  success: { dot: "bg-emerald-500", value: "text-emerald-600" },
  danger: { dot: "bg-red-500", value: "text-red-600" },
  warning: { dot: "bg-amber-500", value: "text-amber-600" },
  info: { dot: "bg-cyan-500", value: "text-cyan-700" },
  muted: { dot: "bg-gray-400", value: "text-gray-700" },
}

function Kpi({ label, value, hint, tone = "primary" }) {
  const t = TONES[tone] || TONES.primary
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
      </div>
      <p className={`text-lg md:text-xl font-bold mt-1 leading-tight ${t.value}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function Card({ titulo, children, className = "", dense = false }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}
    >
      <div className="px-5 py-3 border-b border-gray-100">
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
