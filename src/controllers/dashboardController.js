import prisma from "../config/prisma.js"

const calcularResumo = (transacoes) => {
  const entradas = transacoes
    .filter((transacao) => transacao.tipo === "entrada")
    .reduce((total, transacao) => total + transacao.valor, 0)

  const saidas = transacoes
    .filter((transacao) => transacao.tipo === "saida")
    .reduce((total, transacao) => total + transacao.valor, 0)

  const lucro = entradas - saidas

  return {
    entradas,
    saidas,
    lucro
  }
}

const formatarDia = (data) => {
  return data.toISOString().slice(0, 10)
}

export const dashboardFinanceiro = async (req, res) => {
  try {
    const contasDaEmpresa = await prisma.contaReceber.findMany({
      where: {
        empresaId: req.empresaId
      }
    })
    
    for (const conta of contasDaEmpresa) {
      let novoStatus = "pendente"
    
      if (conta.valorPago >= conta.valorTotal) {
        novoStatus = "pago"
      } else if (conta.vencimento && new Date(conta.vencimento) < new Date()) {
        novoStatus = "vencido"
      } else if (conta.valorPago > 0) {
        novoStatus = "parcial"
      }
    
      if (conta.status !== novoStatus) {
        await prisma.contaReceber.update({
          where: { id: conta.id },
          data: { status: novoStatus }
        })
      }
    }
    const agora = new Date()

    const inicioHoje = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      0, 0, 0, 0
    )

    const inicioSeteDias = new Date()
    inicioSeteDias.setDate(agora.getDate() - 6)
    inicioSeteDias.setHours(0, 0, 0, 0)

    const inicioMes = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      1,
      0, 0, 0, 0
    )

    const whereBase = {
      empresaId: req.empresaId,
      status: "ativa"
    }

    const transacoesHoje = await prisma.transacao.findMany({
      where: {
        ...whereBase,
        createdAt: {
          gte: inicioHoje
        }
      }
    })

    const transacoesSeteDias = await prisma.transacao.findMany({
      where: {
        ...whereBase,
        createdAt: {
          gte: inicioSeteDias
        }
      }
    })

    const transacoesMes = await prisma.transacao.findMany({
      where: {
        ...whereBase,
        createdAt: {
          gte: inicioMes
        }
      }
    })

    const formasPagamento = transacoesMes
  .filter((transacao) => transacao.tipo === "entrada" && transacao.formaPagamento)
  .reduce((acc, transacao) => {
    const chave = transacao.formaPagamento

    if (!acc[chave]) {
      acc[chave] = 0
    }

    acc[chave] += transacao.valor
    return acc
  }, {})

    const ultimasTransacoes = await prisma.transacao.findMany({
      where: whereBase,
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })

    const clientesPendentes = await prisma.cliente.count({
      where: {
        empresaId: req.empresaId,
        status: "pendente"
      }
    })

    const contasPendentes = await prisma.contaReceber.count({
      where: {
        empresaId: req.empresaId,
        status: "pendente"
      }
    })

    const contasParciais = await prisma.contaReceber.count({
      where: {
        empresaId: req.empresaId,
        status: "parcial"
      }
    })

    const contasPagas = await prisma.contaReceber.count({
      where: {
        empresaId: req.empresaId,
        status: "pago"
      }
    })

    const contasVencidas = await prisma.contaReceber.count({
      where: {
        empresaId: req.empresaId,
        status: "vencido"
      }
    })

    const contasEmAberto = await prisma.contaReceber.findMany({
      where: {
        empresaId: req.empresaId,
        status: {
          in: ["pendente", "parcial"]
        }
      }
    })

    const totalEmAberto = contasEmAberto.reduce((total, conta) => {
      return total + (conta.valorTotal - conta.valorPago)
    }, 0)

    const contasSomenteVencidas = await prisma.contaReceber.findMany({
      where: {
        empresaId: req.empresaId,
        status: "vencido"
      }
    })
    
    const totalVencido = contasSomenteVencidas.reduce((total, conta) => {
      return total + (conta.valorTotal - conta.valorPago)
    }, 0)
    const grafico7Dias = []

    for (let i = 0; i < 7; i++) {
      const inicioDia = new Date(inicioSeteDias)
      inicioDia.setDate(inicioSeteDias.getDate() + i)
      inicioDia.setHours(0, 0, 0, 0)

      const fimDia = new Date(inicioDia)
      fimDia.setHours(23, 59, 59, 999)

      const transacoesDoDia = transacoesSeteDias.filter((transacao) => {
        const data = new Date(transacao.createdAt)
        return data >= inicioDia && data <= fimDia
      })

      const resumoDia = calcularResumo(transacoesDoDia)

      grafico7Dias.push({
        dia: formatarDia(inicioDia),
        entradas: resumoDia.entradas,
        saidas: resumoDia.saidas,
        lucro: resumoDia.lucro
      })
    }

    res.json({
      hoje: calcularResumo(transacoesHoje),
      seteDias: calcularResumo(transacoesSeteDias),
      mes: calcularResumo(transacoesMes),
      clientesPendentes,
      contasPendentes,
      contasParciais,
      contasPagas,
      contasVencidas,
      totalEmAberto,
      totalVencido,
      ultimasTransacoes,
      grafico7Dias, 
      formasPagamento
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao carregar dashboard financeiro"
    })
  }
}

export const dashboardCobrancas = async (req, res) => {
  try {
    const contas = await prisma.contaReceber.findMany({
      where: {
        empresaId: req.empresaId
      }
    })

    const contasPendentes = contas.filter(
      (conta) => conta.status === "pendente"
    ).length

    const contasParciais = contas.filter(
      (conta) => conta.status === "parcial"
    ).length

    const contasPagas = contas.filter(
      (conta) => conta.status === "pago"
    ).length

    const contasVencidas = contas.filter(
      (conta) => conta.status === "vencido"
    ).length

    const totalEmAberto = contas
      .filter((conta) =>
        ["pendente", "parcial", "vencido"].includes(conta.status)
      )
      .reduce((total, conta) => {
        return total + (Number(conta.valorTotal || 0) - Number(conta.valorPago || 0))
      }, 0)

    const totalVencido = contas
      .filter((conta) => conta.status === "vencido")
      .reduce((total, conta) => {
        return total + (Number(conta.valorTotal || 0) - Number(conta.valorPago || 0))
      }, 0)

    res.json({
      contasPendentes,
      contasParciais,
      contasPagas,
      contasVencidas,
      totalEmAberto,
      totalVencido
    })
  } catch (error) {
    console.error("Erro ao carregar dashboard de cobranças:", error)

    res.status(500).json({
      error: "Erro ao carregar dashboard de cobranças"
    })
  }
}