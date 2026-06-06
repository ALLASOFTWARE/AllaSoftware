import prisma from "../config/prisma.js"
import { getPaginationParams, montarRespostaPaginada } from "../utils/pagination.js"

const calcularStatusContaPagar = (valorTotal, valorPago, vencimento, statusAtual) => {
  if (statusAtual === "cancelada") return "cancelada"
  if (valorPago >= valorTotal) return "pago"

  const agora = new Date()

  if (vencimento && new Date(vencimento) < agora) {
    return valorPago > 0 ? "parcial" : "vencido"
  }

  if (valorPago <= 0) return "pendente"

  return "parcial"
}

const atualizarContasPagarVencidasDaEmpresa = async (empresaId) => {
  await prisma.contaPagar.updateMany({
    where: {
      empresaId,
      status: "pendente",
      vencimento: {
        lt: new Date()
      }
    },
    data: {
      status: "vencido"
    }
  })
}

const montarResumoContasPagar = async (where, total) => {
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
    prisma.contaPagar.groupBy({
      by: ["status"],
      where,
      _count: {
        _all: true
      }
    }),
    prisma.contaPagar.aggregate({
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
    canceladas: quantidadePorStatus.cancelada || 0,
    totalEmAberto:
      Number(valoresEmAberto._sum.valorTotal || 0) -
      Number(valoresEmAberto._sum.valorPago || 0)
  }
}

const validarValorPositivo = (valor, nomeCampo) => {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero <= 0) {
    return {
      valido: false,
      numero,
      error: `${nomeCampo} deve ser maior que zero`
    }
  }

  return {
    valido: true,
    numero
  }
}

export const criarContaPagar = async (req, res) => {
  try {
    const {
      descricao,
      categoria,
      valorTotal,
      vencimento,
      observacoes
    } = req.body || {}

    if (!descricao || valorTotal === undefined) {
      return res.status(400).json({
        error: "Os campos descrição e valorTotal são obrigatórios"
      })
    }

    const valorValidado = validarValorPositivo(valorTotal, "O valor total")

    if (!valorValidado.valido) {
      return res.status(400).json({
        error: valorValidado.error
      })
    }

    const dataVencimento = vencimento ? new Date(vencimento) : null
    const statusInicial = calcularStatusContaPagar(
      valorValidado.numero,
      0,
      dataVencimento
    )

    const conta = await prisma.contaPagar.create({
      data: {
        empresaId: req.empresaId,
        descricao,
        categoria: categoria || null,
        valorTotal: valorValidado.numero,
        valorPago: 0,
        status: statusInicial,
        vencimento: dataVencimento,
        observacoes: observacoes || null
      },
      include: {
        pagamentos: {
          include: {
            transacao: true
          }
        }
      }
    })

    res.status(201).json(conta)
  } catch (error) {
    console.error("Erro ao criar conta a pagar:", error)
    res.status(500).json({
      error: "Erro ao criar conta a pagar"
    })
  }
}

export const listarContasPagar = async (req, res) => {
  try {
    const { status, categoria } = req.query
    const { temPaginacao, page, limit, skip } = getPaginationParams(req.query)
    await atualizarContasPagarVencidasDaEmpresa(req.empresaId)

    const where = {
      empresaId: req.empresaId
    }

    if (status) {
      where.status = status
    }

    if (categoria) {
      where.categoria = categoria
    }

    const queryContas = {
      where,
      include: {
        pagamentos: {
          include: {
            transacao: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: [
        {
          vencimento: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    }

    if (temPaginacao) {
      queryContas.skip = skip
      queryContas.take = limit
    }

    const [contas, total] = await Promise.all([
      prisma.contaPagar.findMany(queryContas),
      temPaginacao ? prisma.contaPagar.count({ where }) : Promise.resolve(null)
    ])

    if (temPaginacao) {
      const summary = await montarResumoContasPagar(where, total)
      return res.json(montarRespostaPaginada({ data: contas, total, page, limit, summary }))
    }

    res.json(contas)
  } catch (error) {
    console.error("Erro ao listar contas a pagar:", error)
    res.status(500).json({
      error: "Erro ao listar contas a pagar"
    })
  }
}

export const atualizarContaPagar = async (req, res) => {
  try {
    const { id } = req.params
    const {
      descricao,
      categoria,
      valorTotal,
      vencimento,
      observacoes
    } = req.body || {}

    const conta = await prisma.contaPagar.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!conta) {
      return res.status(404).json({
        error: "Conta a pagar não encontrada para esta empresa"
      })
    }

    if (["pago", "cancelada"].includes(conta.status)) {
      return res.status(400).json({
        error: "Contas pagas ou canceladas não podem ser editadas"
      })
    }

    let valorFinal = conta.valorTotal

    if (valorTotal !== undefined) {
      const valorValidado = validarValorPositivo(valorTotal, "O valor total")

      if (!valorValidado.valido) {
        return res.status(400).json({
          error: valorValidado.error
        })
      }

      if (valorValidado.numero < conta.valorPago) {
        return res.status(400).json({
          error: "O valor total não pode ser menor que o valor já pago"
        })
      }

      valorFinal = valorValidado.numero
    }

    const dataVencimento =
      vencimento === undefined
        ? conta.vencimento
        : vencimento
        ? new Date(vencimento)
        : null

    const novoStatus = calcularStatusContaPagar(
      valorFinal,
      conta.valorPago,
      dataVencimento,
      conta.status
    )

    const contaAtualizada = await prisma.contaPagar.update({
      where: {
        id: conta.id
      },
      data: {
        descricao: descricao !== undefined ? descricao : undefined,
        categoria:
          categoria === null || categoria === ""
            ? null
            : categoria !== undefined
            ? categoria
            : undefined,
        valorTotal: valorTotal !== undefined ? valorFinal : undefined,
        vencimento: vencimento !== undefined ? dataVencimento : undefined,
        observacoes:
          observacoes === null || observacoes === ""
            ? null
            : observacoes !== undefined
            ? observacoes
            : undefined,
        status: novoStatus
      },
      include: {
        pagamentos: {
          include: {
            transacao: true
          }
        }
      }
    })

    res.json(contaAtualizada)
  } catch (error) {
    console.error("Erro ao atualizar conta a pagar:", error)
    res.status(500).json({
      error: "Erro ao atualizar conta a pagar"
    })
  }
}

export const pagarContaPagar = async (req, res) => {
  try {
    const { id } = req.params
    const { valor, formaPagamento, descricao } = req.body || {}

    if (valor === undefined) {
      return res.status(400).json({
        error: "O campo valor é obrigatório"
      })
    }

    const conta = await prisma.contaPagar.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!conta) {
      return res.status(404).json({
        error: "Conta a pagar não encontrada para esta empresa"
      })
    }

    if (conta.status === "cancelada") {
      return res.status(400).json({
        error: "Conta cancelada não pode receber pagamento"
      })
    }

    if (conta.status === "pago") {
      return res.status(400).json({
        error: "Esta conta já está totalmente paga"
      })
    }

    const valorValidado = validarValorPositivo(valor, "O valor do pagamento")

    if (!valorValidado.valido) {
      return res.status(400).json({
        error: valorValidado.error
      })
    }

    const novoValorPago = conta.valorPago + valorValidado.numero

    if (novoValorPago > conta.valorTotal) {
      return res.status(400).json({
        error: "O pagamento excede o valor total da conta"
      })
    }

    const novoStatus = calcularStatusContaPagar(
      conta.valorTotal,
      novoValorPago,
      conta.vencimento,
      conta.status
    )

    const resultado = await prisma.$transaction(async (tx) => {
      const transacao = await tx.transacao.create({
        data: {
          tipo: "saida",
          valor: valorValidado.numero,
          categoria: conta.categoria || "Conta fixa",
          descricao: descricao || `Pagamento da conta a pagar #${conta.id} - ${conta.descricao}`,
          formaPagamento,
          status: "ativa",
          empresaId: req.empresaId
        }
      })

      const pagamento = await tx.pagamentoContaPagar.create({
        data: {
          contaPagarId: conta.id,
          empresaId: req.empresaId,
          transacaoId: transacao.id,
          valor: valorValidado.numero,
          formaPagamento,
          descricao: descricao || null
        }
      })

      const contaAtualizada = await tx.contaPagar.update({
        where: {
          id: conta.id
        },
        data: {
          valorPago: novoValorPago,
          status: novoStatus
        },
        include: {
          pagamentos: {
            include: {
              transacao: true
            },
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      })

      return {
        pagamento,
        conta: contaAtualizada,
        transacao
      }
    })

    res.json({
      message: "Pagamento registrado com sucesso",
      ...resultado,
      saldoRestante: resultado.conta.valorTotal - resultado.conta.valorPago
    })
  } catch (error) {
    console.error("Erro ao pagar conta a pagar:", error)
    res.status(500).json({
      error: "Erro ao pagar conta a pagar"
    })
  }
}

export const cancelarContaPagar = async (req, res) => {
  try {
    const { id } = req.params

    const conta = await prisma.contaPagar.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!conta) {
      return res.status(404).json({
        error: "Conta a pagar não encontrada para esta empresa"
      })
    }

    if (conta.valorPago > 0) {
      return res.status(400).json({
        error: "Conta com pagamento registrado não pode ser cancelada"
      })
    }

    const contaCancelada = await prisma.contaPagar.update({
      where: {
        id: conta.id
      },
      data: {
        status: "cancelada"
      }
    })

    res.json({
      message: "Conta cancelada com sucesso",
      conta: contaCancelada
    })
  } catch (error) {
    console.error("Erro ao cancelar conta a pagar:", error)
    res.status(500).json({
      error: "Erro ao cancelar conta a pagar"
    })
  }
}
