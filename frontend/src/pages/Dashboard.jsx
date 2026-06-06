import { createElement, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClockAlert,
  DollarSign,
  MessageCircle,
  Package,
  ReceiptText,
  Users
} from "lucide-react"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import { formatarDataHora, formatarMoeda } from "../utils/formatters"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

/**
 * Dashboard principal – versão compacta e organizada.
 * Mantém a ideia de KPIs + gráfico, mas com hierarquia clara,
 * cards densos e seções agrupadas por contexto.
 */
export default function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")
  const [dados, setDados] = useState(null)
  const [comissao, setComissao] = useState(null)
  const [serie, setSerie] = useState([])
  const [alertas, setAlertas] = useState({
    resumo: {
      total: 0,
      criticos: 0,
      atencao: 0,
      informativos: 0
    },
    alertas: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarResumo = async () => {
      try {
        const reqs = [
          api.get("/clientes?page=1&limit=1"),
          api.get("/clientes?page=1&limit=1&status=pendente"),
          api.get("/dashboard/cobrancas"),
          api.get("/dashboard/vendas-serie").catch(() => ({ data: [] })),
          api.get("/alertas/operacionais").catch(() => ({
            data: {
              resumo: {
                total: 0,
                criticos: 0,
                atencao: 0,
                informativos: 0
              },
              alertas: []
            }
          })),
        ]
        if (usuario?.id) reqs.push(api.get("/comissoes/me"))

        const [clientesRes, clientesPendentesRes, cobrancasRes, serieRes, alertasRes, comissaoRes] =
          await Promise.all(reqs)

        const cobrancas = cobrancasRes.data || {}

        setDados({
          totalClientes: clientesRes.data?.pagination?.total || 0,
          clientesPendentes: clientesPendentesRes.data?.pagination?.total || 0,
          contasPendentes: cobrancas.contasPendentes || 0,
          contasVencidas: cobrancas.contasVencidas || 0,
          totalEmAberto: cobrancas.totalEmAberto || 0,
          totalVencido: cobrancas.totalVencido || 0,
        })
        setSerie(serieRes?.data || [])
        setAlertas(alertasRes?.data || {
          resumo: {
            total: 0,
            criticos: 0,
            atencao: 0,
            informativos: 0
          },
          alertas: []
        })
        if (comissaoRes?.data) setComissao(comissaoRes.data)
      } catch (e) {
        console.error("Erro ao carregar dashboard principal:", e)
      } finally {
        setLoading(false)
      }
    }
    carregarResumo()
  }, [])

  const primeiroNome = useMemo(
    () => (usuario?.nome || "").split(" ")[0],
    [usuario]
  )

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-64 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Header enxuto */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D2E47]">
            Olá, {primeiroNome || "bem-vinda"} 
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Visão rápida do seu dia • Perfil:{" "}
            <span className="font-medium text-gray-700">{usuario?.role}</span>
          </p>
        </div>

        {comissao && (
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">
              Comissão do mês
            </span>
            <span className="text-base font-bold text-emerald-600">
              {formatarMoeda(comissao?.totais?.comissaoTotal)}
            </span>
          </div>
        )}
      </div>

      {/* KPIs compactos — operação */}
      <SectionTitle>Alertas operacionais</SectionTitle>
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-2 xl:gap-3">
          <AlertaResumo
            label="Criticos"
            value={alertas?.resumo?.criticos || 0}
            tone="danger"
          />
          <AlertaResumo
            label="Atencao"
            value={alertas?.resumo?.atencao || 0}
            tone="warning"
          />
          <AlertaResumo
            label="Informativos"
            value={alertas?.resumo?.informativos || 0}
            tone="info"
          />
        </div>

        {(alertas?.alertas || []).length === 0 ? (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Operacao sem alertas relevantes agora.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {alertas.alertas.map((alerta) => (
              <AlertaOperacionalCard
                key={alerta.id}
                alerta={alerta}
                onAbrir={() => alerta.href && navigate(alerta.href)}
              />
            ))}
          </div>
        )}
      </div>

      <SectionTitle>Operação</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini
          label="Clientes"
          value={dados?.totalClientes || 0}
          accent="indigo"
          Icon={Users}
        />
        <KpiMini
          label="Contas pendentes"
          value={dados?.contasPendentes || 0}
          accent="sky"
          Icon={ReceiptText}
        />
        <KpiMini
          label="Contas vencidas"
          value={dados?.contasVencidas || 0}
          accent="red"
          Icon={ClockAlert}
        />
        {comissao && (
          <KpiMini
            label="Itens comissionados"
            value={comissao?.itens?.length || 0}
            accent="emerald"
            Icon={DollarSign}
          />
        )}
      </div>

      {/* Financeiro resumido */}
      <SectionTitle className="mt-6">Cobranças</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <KpiInline
          label="Total em aberto"
          value={formatarMoeda(dados?.totalEmAberto)}
          tone="neutral"
          Icon={ReceiptText}
        />
        <KpiInline
          label="Total vencido"
          value={formatarMoeda(dados?.totalVencido)}
          tone="danger"
          Icon={ClockAlert}
        />
      </div>

      {/* Gráfico */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#2D2E47]">
            Vendas — últimos dias
          </h2>
          <span className="text-[11px] text-gray-400">Atualizado agora</span>
        </div>
        <div className="overflow-x-auto px-2 pb-3 pt-2">
          <div className="h-[220px] min-w-[520px] sm:h-[240px] sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F8AA3" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2F8AA3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={48} />
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
                dataKey="total"
                stroke="#2F8AA3"
                strokeWidth={2}
                fill="url(#gradVendas)"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/* ---------- Subcomponentes ---------- */

const ALERTA_TONES = {
  critico: {
    card: "border-red-100 bg-red-50/70",
    badge: "bg-red-100 text-red-700",
    icon: "bg-red-100 text-red-700 border-red-200"
  },
  atencao: {
    card: "border-amber-100 bg-amber-50/70",
    badge: "bg-amber-100 text-amber-700",
    icon: "bg-amber-100 text-amber-700 border-amber-200"
  },
  info: {
    card: "border-sky-100 bg-sky-50/70",
    badge: "bg-sky-100 text-sky-700",
    icon: "bg-sky-100 text-sky-700 border-sky-200"
  }
}

const ALERTA_ICONS = {
  contas_receber: ReceiptText,
  contas_pagar: DollarSign,
  agendamentos: CalendarDays,
  estoque: Package,
  clientes: Users,
  whatsapp: MessageCircle,
  whatsapp_erros: MessageCircle
}

function AlertaResumo({ label, value, tone = "info" }) {
  const classes = {
    danger: "border-red-100 bg-red-50 text-red-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    info: "border-sky-100 bg-sky-50 text-sky-700"
  }

  return (
    <div className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${classes[tone] || classes.info}`}>
      <span className="block text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
        {label}
      </span>
      <span className="mt-1 block text-xl font-bold leading-none sm:text-2xl">{value}</span>
    </div>
  )
}

function AlertaOperacionalCard({ alerta, onAbrir }) {
  const tone = ALERTA_TONES[alerta.prioridade] || ALERTA_TONES.info
  const Icon = ALERTA_ICONS[alerta.tipo] || AlertTriangle
  const itens = (alerta.itens || []).slice(0, 3)

  return (
    <div className={`rounded-xl border p-3 shadow-sm sm:p-4 ${tone.card}`}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`h-8 w-8 shrink-0 rounded-full border flex items-center justify-center sm:h-10 sm:w-10 ${tone.icon}`}>
          {createElement(Icon, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-[#2D2E47] break-words">
                {alerta.titulo}
              </h4>
              <p className="mt-0.5 hidden text-xs text-gray-600 sm:block">{alerta.descricao}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${tone.badge}`}>
              {alerta.quantidade}
            </span>
          </div>

          {alerta.valor !== null && alerta.valor !== undefined && (
            <p className="mt-1.5 text-sm font-semibold text-[#2D2E47] sm:mt-2">
              {formatarMoeda(alerta.valor)}
            </p>
          )}

          {alerta.metadata?.percentual !== undefined && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className={`h-full rounded-full ${
                    alerta.metadata.percentual >= 100
                      ? "bg-red-500"
                      : alerta.metadata.percentual >= 95
                      ? "bg-amber-500"
                      : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.min(alerta.metadata.percentual, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {alerta.metadata.usadas} de {alerta.metadata.limite} mensagens usadas ({alerta.metadata.percentual}%)
              </p>
            </div>
          )}

          {itens.length > 0 && (
            <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
              {itens.map((item) => (
                <p key={`${alerta.id}-${item.id}`} className="truncate text-xs text-gray-700">
                  {formatarItemAlerta(alerta.tipo, item)}
                </p>
              ))}
            </div>
          )}

          {alerta.href && (
            <button
              type="button"
              onClick={onAbrir}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#2F8AA3] shadow-sm hover:bg-gray-50 sm:mt-3 sm:py-2"
            >
              Ver detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatarItemAlerta(tipo, item) {
  if (tipo === "agendamentos") {
    return `${formatarDataHora(item.dataHora)} - ${item.cliente} - ${item.servico}`
  }

  if (tipo === "estoque") {
    return `${item.nome} - estoque: ${item.estoque}`
  }

  if (tipo === "clientes") {
    return `${item.nome}${item.telefone ? ` - ${item.telefone}` : ""}`
  }

  if (tipo === "whatsapp_erros") {
    return `${item.cliente} - ${item.status}`
  }

  if (tipo === "contas_receber") {
    return `${item.cliente} - ${formatarMoeda(item.saldoRestante)}`
  }

  if (tipo === "contas_pagar") {
    return `${item.descricao || "Conta"} - ${formatarMoeda(item.saldoRestante)}`
  }

  return item.nome || item.titulo || item.descricao || `Item #${item.id}`
}

function SectionTitle({ children, className = "" }) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 ${className}`}
    >
      {children}
    </h3>
  )
}

const ACCENTS = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  red: "bg-red-50 text-red-600 border-red-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
}

function KpiMini({ label, value, hint, accent = "indigo", Icon = ReceiptText }) {
  const accentClass = ACCENTS[accent] || ACCENTS.indigo

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-3 min-h-[5.25rem] flex items-start justify-between gap-2 sm:min-h-24 sm:p-4 sm:gap-4">
      <div className="min-w-0">
        <span className="text-[11px] font-medium text-[#4F5D75] leading-tight sm:text-xs">
          {label}
        </span>
        <span className="block text-lg font-bold text-[#0B1437] mt-1 leading-tight break-words sm:text-2xl">
          {value}
        </span>
        {hint && <span className="block text-xs font-medium text-[#00AFA8] mt-2">{hint}</span>}
      </div>

      <div className={`h-8 w-8 shrink-0 rounded-full border flex items-center justify-center sm:h-10 sm:w-10 ${accentClass}`}>
        {createElement(Icon, { className: "h-3.5 w-3.5 sm:h-5 sm:w-5" })}
      </div>
    </div>
  )
}

function KpiInline({ label, value, tone = "neutral", Icon = DollarSign }) {
  const toneClass =
    tone === "danger" ? "text-red-600" : "text-[#2D2E47]"
  const iconClass =
    tone === "danger"
      ? "bg-red-50 text-red-600 border-red-100"
      : "bg-cyan-50 text-[#0891B2] border-cyan-100"

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-3 flex items-center justify-between gap-2 sm:p-4 sm:gap-4">
      <div>
        <span className="text-[11px] font-medium text-[#4F5D75] sm:text-xs">{label}</span>
        <span className={`block text-sm font-bold mt-1 break-words sm:text-lg ${toneClass}`}>{value}</span>
      </div>
      <div className={`h-8 w-8 shrink-0 rounded-full border flex items-center justify-center sm:h-10 sm:w-10 ${iconClass}`}>
        {createElement(Icon, { className: "h-3.5 w-3.5 sm:h-5 sm:w-5" })}
      </div>
    </div>
  )
}
