import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import ClienteSearchSelect from "../components/ClienteSearchSelect"

export default function Vendas() {
  const [searchParams] = useSearchParams()

  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [servicos, setServicos] = useState([])

  const [clienteId, setClienteId] = useState("")
  const [buscaCliente, setBuscaCliente] = useState("")

  const [tipoPreco, setTipoPreco] = useState("varejo")
  const [aba, setAba] = useState("produto")
  const [busca, setBusca] = useState("")

  const [itens, setItens] = useState([])

  const [desconto, setDesconto] = useState("")
  const [valorPago, setValorPago] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("")
  const [vencimento, setVencimento] = useState("")
  const [descricaoConta, setDescricaoConta] = useState("")

  const [salvando, setSalvando] = useState(false)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    const idUrl = searchParams.get("clienteId")
    const nomeUrl = searchParams.get("clienteNome")
    if (idUrl) setClienteId(idUrl)
    if (nomeUrl) setBuscaCliente(nomeUrl)
  }, [searchParams])

  const carregarDados = async () => {
    try {
      const [c, p, s] = await Promise.all([
        api.get("/clientes"),
        api.get("/produtos"),
        api.get("/servicos"),
      ])
      setClientes(c.data || [])
      setProdutos(p.data || [])
      setServicos(s.data || [])
    } catch (error) {
      console.error("Erro ao carregar dados da venda:", error)
    }
  }

  const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })

  const precoDe = (item, tipo) => {
    if (tipo === "produto") {
      if (tipoPreco === "atacado" && item.precoAtacado) {
        return Number(item.precoAtacado)
      }
      return Number(item.precoVarejo || 0)
    }
    return Number(item.preco || 0)
  }

  const lista = aba === "produto" ? produtos : servicos

  const listaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((i) => i.nome.toLowerCase().includes(q))
  }, [lista, busca])

  const adicionarItem = (item) => {
    const preco = precoDe(item, aba)
    setItens((prev) => {
      const idx = prev.findIndex(
        (i) => i.tipoItem === aba && i.referenciaId === item.id
      )
      if (idx >= 0) {
        const novo = [...prev]
        const atual = novo[idx]
        const qtd = atual.quantidade + 1
        novo[idx] = {
          ...atual,
          quantidade: qtd,
          precoUnitario: preco,
          subtotal: qtd * preco,
        }
        return novo
      }
      return [
        ...prev,
        {
          tipoItem: aba,
          referenciaId: item.id,
          nomeItem: item.nome,
          quantidade: 1,
          precoUnitario: preco,
          subtotal: preco,
        },
      ]
    })
  }

  const alterarQuantidade = (index, delta) => {
    setItens((prev) =>
      prev
        .map((i, idx) => {
          if (idx !== index) return i
          const qtd = Math.max(0, i.quantidade + delta)
          return { ...i, quantidade: qtd, subtotal: qtd * i.precoUnitario }
        })
        .filter((i) => i.quantidade > 0)
    )
  }

  const removerItem = (index) =>
    setItens((prev) => prev.filter((_, i) => i !== index))

  const totalBruto = useMemo(
    () => itens.reduce((acc, i) => acc + Number(i.subtotal || 0), 0),
    [itens]
  )
  const totalFinal = useMemo(
    () => totalBruto - Number(desconto || 0),
    [totalBruto, desconto]
  )
  const valorPagoNum = Number(valorPago || 0)
  const valorRestante = Math.max(totalFinal - valorPagoNum, 0)
  const totalItens = itens.reduce((a, i) => a + i.quantidade, 0)

  const podePagar = itens.length > 0 && totalFinal >= 0

  const salvarVenda = async () => {
    if (totalFinal < 0) {
      alert("O desconto não pode ser maior que o total da venda")
      return
    }
    if (valorPagoNum < 0) {
      alert("O valor pago não pode ser negativo")
      return
    }
    if (valorPagoNum > totalFinal) {
      alert("O valor pago não pode ser maior que o total final")
      return
    }
    if (!clienteId && valorPagoNum < totalFinal) {
      alert("Venda sem cliente só pode ser finalizada com pagamento total")
      return
    }

    try {
      setSalvando(true)
      await api.post("/vendas", {
        clienteId: clienteId ? Number(clienteId) : null,
        tipoPreco,
        desconto: Number(desconto || 0),
        formaPagamento: formaPagamento || null,
        valorPago: valorPagoNum,
        vencimento: valorRestante > 0 ? vencimento || null : null,
        descricaoConta: valorRestante > 0 ? descricaoConta || null : null,
        itens: itens.map((i) => ({
          tipoItem: i.tipoItem,
          referenciaId: i.referenciaId,
          quantidade: i.quantidade,
        })),
      })

      alert("Venda criada com sucesso!")

      setItens([])
      setDesconto("")
      setValorPago("")
      setFormaPagamento("")
      setVencimento("")
      setDescricaoConta("")
      setClienteId("")
      setBuscaCliente("")
      setCarrinhoAberto(false)
      setTipoPreco("varejo")
    } catch (error) {
      console.error("Erro ao salvar venda:", error)
      alert(error.response?.data?.error || "Erro ao salvar venda")
    } finally {
      setSalvando(false)
    }
  }

  const carrinhoProps = {
    itens,
    totalBruto,
    totalFinal,
    totalItens,
    desconto,
    setDesconto,
    valorPago,
    setValorPago,
    valorRestante,
    formaPagamento,
    setFormaPagamento,
    vencimento,
    setVencimento,
    descricaoConta,
    setDescricaoConta,
    clienteId,
    clientes,
    setClienteId,
    buscaCliente,
    alterarQuantidade,
    removerItem,
    podePagar,
    salvando,
    salvarVenda,
    formatarMoeda,
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        
        {/* HEADER FIXO */}
        <div className="flex-none flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
              Nova Venda
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Adicione itens e finalize em um clique.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setTipoPreco("varejo")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  tipoPreco === "varejo"
                    ? "bg-white shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Varejo
              </button>
              <button
                onClick={() => setTipoPreco("atacado")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  tipoPreco === "atacado"
                    ? "bg-white shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Atacado
              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-6 h-full">

            {/* ESQUERDA (CATÁLOGO) */}
            <section className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-0">
              
              {/* topo */}
              <div className="p-5 border border-gray-200 space-y-4">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produtos ou serviços..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3"
                />

                <div className="inline-flex bg-gray-100 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setAba("produto")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      aba === "produto"
                        ? "bg-white text-[#2D2E47] shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Produtos
                  </button>

                  <button
                    type="button"
                    onClick={() => setAba("servico")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      aba === "servico"
                        ? "bg-white text-[#2D2E47] shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Serviços
                  </button>
                </div>
              </div>

              {/* LISTA COM SCROLL */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {listaFiltrada.map((item) => {
                    const preco = precoDe(item, aba)

                    return (
                      <button
                        key={item.id}
                        onClick={() => adicionarItem(item)}
                        className="border border-gray-200 rounded-xl p-4 text-left hover:shadow"
                      >
                        <p className="font-medium">{item.nome}</p>
                        <p>{formatarMoeda(preco)}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* DIREITA (CARRINHO) */}
            <aside className="flex flex-col bg-white rounded-2xl border border-gray-200 min-h-0 overflow-hidden">
              <Carrinho {...carrinhoProps} />
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/* ============== CARRINHO ============== */

function Carrinho({
  itens,
  totalBruto,
  totalFinal,
  totalItens,
  desconto,
  setDesconto,
  valorPago,
  setValorPago,
  valorRestante,
  formaPagamento,
  setFormaPagamento,
  vencimento,
  setVencimento,
  descricaoConta,
  setDescricaoConta,
  clienteId,
  clientes,
  setClienteId,
  buscaCliente,
  alterarQuantidade,
  removerItem,
  podePagar,
  salvando,
  salvarVenda,
  formatarMoeda,
}) {
  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Cliente */}
      <div className="flex-none px-5 pt-5 pb-4 border-b border-gray-100">
        <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-2 font-medium">
          Cliente
        </label>
        <ClienteSearchSelect
          clientes={clientes}
          clienteId={clienteId}
          setClienteId={setClienteId}
          buscaInicial={buscaCliente}
          placeholder="Buscar cliente ou venda à vista"
          permitirSemCliente={true}
        />
      </div>

      {/* Itens do carrinho */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5">
        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <CartIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-[#2D2E47]">
              Carrinho vazio
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
              Clique nos itens à esquerda para adicioná-los à venda.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {itens.map((item, index) => (
              <div
                key={`${item.tipoItem}-${item.referenciaId}-${index}`}
                className="group flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3"
              >
                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#2F8AA3]/10 text-[#2F8AA3] flex items-center justify-center">
                  {item.tipoItem === "produto" ? (
                    <PackageIcon className="w-4 h-4" />
                  ) : (
                    <WrenchIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#2D2E47] truncate">
                    {item.nomeItem}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatarMoeda(item.precoUnitario)} · un
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(index, -1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-[#2F8AA3]"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-6 text-center">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(index, 1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-[#2F8AA3]"
                  >
                    +
                  </button>
                </div>
                <div className="text-right w-20 shrink-0">
                  <p className="text-sm font-semibold text-[#2D2E47] tabular-nums">
                    {formatarMoeda(item.subtotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removerItem(index)}
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo + ação */}
      <div className="flex-none border-t border-gray-100 bg-white px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1 font-medium">
              Desconto
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3E7996]"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1 font-medium">
              Pago agora
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valorPago}
              onChange={(e) => {
                const v = e.target.value.replace(",", ".")
                if (/^\d*\.?\d*$/.test(v)) setValorPago(v)
              }}
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3E7996]"
            />
          </div>
        </div>

        <select
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3E7996] bg-white"
        >
          <option value="">Forma de pagamento</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="cartao_credito">Cartão de crédito</option>
          <option value="cartao_debito">Cartão de débito</option>
        </select>

        {valorRestante > 0 && clienteId && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1 font-medium">
                Vencimento
              </label>
              <input
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3E7996]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1 font-medium">
                Descrição
              </label>
              <input
                type="text"
                value={descricaoConta}
                onChange={(e) => setDescricaoConta(e.target.value)}
                placeholder="Restante da venda"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3E7996]"
              />
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">
              Subtotal ({totalItens} itens)
            </span>
            <span className="text-[#2D2E47] tabular-nums">
              {formatarMoeda(totalBruto)}
            </span>
          </div>
          {Number(desconto || 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Desconto</span>
              <span className="text-gray-500 tabular-nums">
                −{formatarMoeda(Number(desconto || 0))}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-2xl font-bold text-[#2D2E47] tabular-nums">
              {formatarMoeda(totalFinal)}
            </span>
          </div>
          {valorRestante > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-600">Saldo a receber</span>
              <span className="font-medium text-amber-600 tabular-nums">
                {formatarMoeda(valorRestante)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={salvarVenda}
          disabled={!podePagar || salvando}
          className="w-full bg-[#2F8AA3] text-white h-12 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
        >
          {salvando ? "Finalizando..." : "Finalizar venda"}
        </button>

        {!clienteId && valorRestante > 0 && (
          <p className="text-xs text-amber-600 text-center">
            Sem cliente exige pagamento total da venda.
          </p>
        )}
      </div>
    </div>
  )
}

/* ============== ÍCONES (SVG inline, sem dependências) ============== */

function SearchIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function CartIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  )
}

function PackageIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function WrenchIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function PlusIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
