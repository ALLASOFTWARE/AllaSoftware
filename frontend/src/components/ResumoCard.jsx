import {
  ArrowDownLeft,
  ArrowUpRight,
  AlarmClock,
  BadgeDollarSign,
  ChartColumn,
  CircleCheck,
  ClockAlert,
  FileText,
  HandHeart,
  Package,
  Boxes,
  PackageX,
  PackageCheck,
  Receipt,
  ReceiptText,
  ShoppingCart,
  Tags,
  TriangleAlert,
  TrendingUp,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
  UsersRound,
  Wallet,
  DollarSign
} from "lucide-react"

const ICONS = {
  arrowDown: ArrowDownLeft,
  arrowUp: ArrowUpRight,
  alarm: AlarmClock,
  badgeDollar: BadgeDollarSign,
  chart: ChartColumn,
  check: CircleCheck,
  clockAlert: ClockAlert,
  file: FileText,
  hand: HandHeart,
  package: Package,
  box: Boxes,
  packageX: PackageX,
  packageCheck: PackageCheck,
  receiptSimple: Receipt,
  receipt: ReceiptText,
  cart: ShoppingCart,
  tags: Tags,
  alert: TriangleAlert,
  trend: TrendingUp,
  shieldCheck: ShieldCheck,
  userRound: UserRound,
  userRoundCheck: UserRoundCheck,
  userRoundX: UserRoundX,
  users: Users,
  usersRound: UsersRound,
  wallet: Wallet,
  money: DollarSign
}

const inferirIcone = (titulo = "") => {
  const texto = titulo.toLowerCase()

  if (texto.includes("clientes em dia")) return "userRoundCheck"
  if (texto.includes("clientes pendentes")) return "userRoundX"
  if (texto.includes("total de clientes")) return "userRound"
  if (texto.includes("cliente")) return "users"
  if (texto.includes("equipe")) return "usersRound"
  if (texto.includes("admin")) return "shieldCheck"
  if (texto.includes("usuários ativos") || texto.includes("usuarios ativos")) return "userRoundCheck"
  if (texto.includes("usuários inativos") || texto.includes("usuarios inativos")) return "userRoundX"
  if (texto.includes("inativo")) return "packageX"
  if (texto.includes("ativo")) return "packageCheck"
  if (texto.includes("total de produtos")) return "package"
  if (texto.includes("produto")) return "box"
  if (texto.includes("serviço") || texto.includes("servico")) return "hand"
  if (texto.includes("agendamento")) return "calendar"
  if (texto.includes("venda") || texto.includes("comprado")) return "cart"
  if (texto.includes("total de contas")) return "receiptSimple"
  if (texto.includes("total em aberto")) return "badgeDollar"
  if (texto.includes("vencida") || texto.includes("vencido")) return "alarm"
  if (texto.includes("parcial") || texto.includes("pendente")) return "clockAlert"
  if (texto.includes("entrada") || texto.includes("pago")) return "arrowDown"
  if (texto.includes("saída") || texto.includes("saida")) return "arrowUp"
  if (texto.includes("saldo") || texto.includes("lucro")) return "wallet"
  if (texto.includes("comissao") || texto.includes("comissão")) return "money"
  if (texto.includes("aberto") || texto.includes("pendente")) return "alert"
  if (texto.includes("ativo") || texto.includes("dia")) return "check"
  if (texto.includes("preço") || texto.includes("preco") || texto.includes("médio") || texto.includes("medio")) return "tags"
  if (texto.includes("relatório") || texto.includes("relatorio")) return "file"

  return "chart"
}

export default function ResumoCard({ titulo, valor, subtitulo, corIcone, icon }) {
  const iconName = icon || inferirIcone(titulo)
  const iconTone = corIcone || "bg-cyan-50 text-[#0891B2]"
  const Icon = ICONS[iconName] || ChartColumn

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-3 min-h-20 flex items-start justify-between gap-3 sm:min-h-24 sm:p-4 sm:gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#4F5D75] leading-tight">{titulo}</p>
        <p className="text-xl font-bold text-[#0B1437] mt-1 leading-tight break-words sm:text-2xl">{valor}</p>
        {subtitulo && (
          <p className="text-xs font-medium text-[#00AFA8] mt-2">{subtitulo}</p>
        )}
      </div>

      <div
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center sm:h-10 sm:w-10 ${iconTone}`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  )
}
