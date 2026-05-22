import prisma from "../config/prisma.js"
import { gerarComprovantePagamentoConta, imprimirTermico } from "../services/comprovanteService.js"

const calcularStatusConta = (valorTotal, valorPago, vencimento) => {
  if (valorPago >= valorTotal) return "pago"

  const agora = new Date()

  if (vencimento && new Date(vencimento) < agora) {
    return "vencido"
  }

  if (valorPago <= 0) return "pendente"

  return "parcial"
}
const atualizarStatusCliente = async (clienteId, empresaId) => {
  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      empresaId
    },
    select: {
      status: true
    }
  })

  if (!cliente || cliente.status === "inativo") return

  const contas = await prisma.contaReceber.findMany({
    where: {
      clienteId: clienteId,
      empresaId: empresaId
    }
  })

  const temPendencia = contas.some(
    (conta) => conta.status === "pendente" || conta.status === "parcial"
  )

  const novoStatus = temPendencia ? "pendente" : "em_dia"

  await prisma.cliente.update({
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
  const contas = await prisma.contaReceber.findMany({
    where: {
      empresaId: empresaId
    }
  })

  for (const conta of contas) {
    const novoStatus = calcularStatusConta(
      conta.valorTotal,
      conta.valorPago,
      conta.vencimento
    )

    if (conta.status !== novoStatus) {
      await prisma.contaReceber.update({
        where: {
          id: conta.id
        },
        data: {
          status: novoStatus
        }
      })
    }
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
        empresaId: req.empresaId
      }
    })

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente não encontrado para esta empresa"
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

    const contas = await prisma.contaReceber.findMany({
      where,
      include: {
        cliente: true,
        pagamentos: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

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
    const novoValorPago = conta.valorPago + valorPagamento

    if (novoValorPago > conta.valorTotal) {
      return res.status(400).json({
        error: "O pagamento excede o valor total da conta"
      })
    }

    const pagamento = await prisma.pagamentoContaReceber.create({
      data: {
        contaReceberId: conta.id,
        empresaId: req.empresaId,
        valor: valorPagamento,
        formaPagamento,
        descricao
      }
    })

    const novoStatus = calcularStatusConta(
      conta.valorTotal,
      novoValorPago,
      conta.vencimento
    )
    
    const contaAtualizada = await prisma.contaReceber.update({
      where: {
        id: conta.id
      },
      data: {
        valorPago: novoValorPago,
        status: novoStatus
      }
    })

    await atualizarStatusCliente(conta.clienteId, req.empresaId)

    const transacao = await prisma.transacao.create({
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
