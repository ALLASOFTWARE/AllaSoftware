import prisma from "../config/prisma.js"
import { gerarComprovantePagamentoConta, imprimirTermico } from "../services/comprovanteService.js"
import { getPaginationParams, montarRespostaPaginada } from "../utils/pagination.js"

const calcularStatusConta = (valorTotal, valorPago, vencimento) => {
  if (valorPago >= valorTotal) return "pago"

  const agora = new Date()

  if (vencimento && new Date(vencimento) < agora) {
    return "vencido"
  }

  if (valorPago <= 0) return "pendente"

  return "parcial"
}
const atualizarStatusCliente = async (clienteId, empresaId, db = prisma) => {
  const cliente = await db.cliente.findFirst({
    where: {
      id: clienteId,
      empresaId
    },
    select: {
      status: true
    }
  })

  if (!cliente || cliente.status === "inativo") return

  const contas = await db.contaReceber.findMany({
    where: {
      clienteId: clienteId,
      empresaId: empresaId
    }
  })

  const temPendencia = contas.some((conta) =>
    ["pendente", "parcial", "vencido"].includes(conta.status)
  )

  const novoStatus = temPendencia ? "pendente" : "em_dia"

  await db.cliente.update({
    where: {
      id: clienteId
    },
    data: {
      status: novoStatus
    }
  })
}

const atualizarStatusConta = async (contaId, empresaId) => {
  const conta = await prisma.contaReceber.findFirst({
    where: {
      id: contaId,
      empresaId: empresaId
    }
  })

  if (!conta) return null

  const novoStatus = calcularStatusConta(
    conta.valorTotal,
    conta.valorPago,
    conta.vencimento
  )

  return await prisma.contaReceber.update({
    where: {
      id: conta.id
    },
    data: {
      status: novoStatus
    }
  })
}

const atualizarContasVencidasDaEmpresa = async (empresaId) => {
  await prisma.contaReceber.updateMany({
    where: {
      empresaId,
      status: {
        in: ["pendente", "parcial"]
      },
      vencimento: {
        lt: new Date()
      }
    },
    data: {
      status: "vencido"
    }
  })
}

const montarResumoContasReceber = async (where, total) => {
  const statusEmAberto = ["pendente", "parcial", "vencido"]
  const statusFiltro = where.status
  const whereEmAberto = {
    ...where,
    status:
      statusFiltro && statusEmAberto.includes(statusFiltro)
        ? statusFiltro
        : statusFiltro
        ? "__sem_resultado__"
        : {
            in: statusEmAberto
          }
  }

  const [porStatus, valoresEmAberto] = await Promise.all([
    prisma.contaReceber.groupBy({
      by: ["status"],
      where,
      _count: {
        _all: true
      }
    }),
    prisma.contaReceber.aggregate({
      where: whereEmAberto,
      _sum: {
        valorTotal: true,
        valorPago: true
      }
    })
  ])

  const quantidadePorStatus = porStatus.reduce((acc, item) => {
    acc[item.status] = item._count._all
    return acc
  }, {})

  return {
    total,
    pendentes: quantidadePorStatus.pendente || 0,
    parciais: quantidadePorStatus.parcial || 0,
    vencidas: quantidadePorStatus.vencido || 0,
    pagas: quantidadePorStatus.pago || 0,
    totalEmAberto:
      Number(valoresEmAberto._sum.valorTotal || 0) -
      Number(valoresEmAberto._sum.valorPago || 0)
  }
}

// Criar conta a receber
export const criarContaReceber = async (req, res) => {
  try {
    const { clienteId, descricao, valorTotal, vencimento } = req.body || {}

    if (!clienteId || valorTotal === undefined) {
      return res.status(400).json({
        error: "Os campos clienteId e valorTotal são obrigatórios"
      })
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        id: Number(clienteId),
        empresaId: req.empresaId,
        status: {
          not: "inativo"
        }
      }
    })

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente não encontrado ou inativo para esta empresa"
      })
    }

    const dataVencimento = vencimento ? new Date(vencimento) : null

    const statusInicial = calcularStatusConta(
      Number(valorTotal),
      0,
      dataVencimento
    )

    const conta = await prisma.contaReceber.create({
      data: {
      clienteId: Number(clienteId),
      empresaId: req.empresaId,
      descricao,
      valorTotal: Number(valorTotal),
      valorPago: 0,
      status: statusInicial,
      vencimento: dataVencimento
    }
    })

    await atualizarStatusCliente(Number(clienteId), req.empresaId)

    res.status(201).json(conta)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao criar conta a receber"
    })
  }
}

// Listar contas a receber
export const listarContasReceber = async (req, res) => {
  try {
    const { status, clienteId } = req.query
    const { temPaginacao, page, limit, skip } = getPaginationParams(req.query)
    await atualizarContasVencidasDaEmpresa(req.empresaId)
    const where = {
      empresaId: req.empresaId
    }

    if (status) {
      where.status = status
    }

    if (clienteId) {
      where.clienteId = Number(clienteId)
    }

    const queryContas = {
      where,
      include: {
        cliente: true,
        pagamentos: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }

    if (temPaginacao) {
      queryContas.skip = skip
      queryContas.take = limit
    }

    const [contas, total] = await Promise.all([
      prisma.contaReceber.findMany(queryContas),
      temPaginacao ? prisma.contaReceber.count({ where }) : Promise.resolve(null)
    ])

    if (temPaginacao) {
      const summary = await montarResumoContasReceber(where, total)
      return res.json(montarRespostaPaginada({ data: contas, total, page, limit, summary }))
    }

    res.json(contas)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao listar contas a receber"
    })
  }
}

// Registrar pagamento
export const registrarPagamentoConta = async (req, res) => {
  try {
    const { id } = req.params
    const { valor, formaPagamento, descricao } = req.body || {}

    if (valor === undefined) {
      return res.status(400).json({
        error: "O campo valor é obrigatório"
      })
    }

    const conta = await prisma.contaReceber.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      },
      include: {
        cliente: true
      }
    })


    if (!conta) {
      return res.status(404).json({
        error: "Conta a receber não encontrada para esta empresa"
      })
    }

    if (conta.status === "pago") {
      return res.status(400).json({
        error: "Esta conta já está totalmente paga"
      })
    }

    const valorPagamento = Number(valor)

    if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
      return res.status(400).json({
        error: "O valor do pagamento deve ser maior que zero"
      })
    }

    const novoValorPago = conta.valorPago + valorPagamento

    if (novoValorPago > conta.valorTotal) {
      return res.status(400).json({
        error: "O pagamento excede o valor total da conta"
      })
    }

    const novoStatus = calcularStatusConta(
      conta.valorTotal,
      novoValorPago,
      conta.vencimento
    )

    const { pagamento, contaAtualizada, transacao } = await prisma.$transaction(
      async (tx) => {
        const pagamentoCriado = await tx.pagamentoContaReceber.create({
          data: {
            contaReceberId: conta.id,
            empresaId: req.empresaId,
            valor: valorPagamento,
            formaPagamento,
            descricao
          }
        })

        const contaAtualizadaTransacao = await tx.contaReceber.update({
          where: {
            id: conta.id
          },
          data: {
            valorPago: novoValorPago,
            status: novoStatus
          }
        })

        await atualizarStatusCliente(conta.clienteId, req.empresaId, tx)

        const transacaoCriada = await tx.transacao.create({
          data: {
            tipo: "entrada",
            valor: valorPagamento,
            categoria: "Pagamento de cliente",
            descricao:
              descricao ||
              `Pagamento da conta ${conta.id} do cliente ${conta.cliente.nome}`,
            formaPagamento,
            status: "ativa",
            empresaId: req.empresaId
          }
        })

        return {
          pagamento: pagamentoCriado,
          contaAtualizada: contaAtualizadaTransacao,
          transacao: transacaoCriada
        }
      }
    )

    const resposta = {
      message: "Pagamento registrado com sucesso",
      pagamento,
      conta: contaAtualizada,
      saldoRestante: contaAtualizada.valorTotal - contaAtualizada.valorPago,
      transacaoFinanceira: transacao
    }

    try {
      const empresa = { nome: process.env.EMPRESA_NOME }
      const { texto } = await gerarComprovantePagamentoConta(
        {
          pagamento,
          conta: { ...contaAtualizada, cliente: conta.cliente },
          saldoRestante: resposta.saldoRestante,
          transacaoFinanceira: transacao
        },
        empresa
      )
      await imprimirTermico(texto)
      res.json(resposta)
    } catch (errComprovante) {
      console.error("[Comprovante] Pagamento:", errComprovante)
      res.json(resposta)
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao registrar pagamento"
    })
  }
}
