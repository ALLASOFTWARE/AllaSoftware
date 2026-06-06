import prisma from "../config/prisma.js"
import { getPaginationParams, montarRespostaPaginada } from "../utils/pagination.js"

const statusPermitidosCliente = ["em_dia", "pendente", "inativo"]

const montarResumoClientes = async (where, total) => {
  const porStatus = await prisma.cliente.groupBy({
    by: ["status"],
    where,
    _count: {
      _all: true
    }
  })

  const quantidadePorStatus = porStatus.reduce((acc, item) => {
    acc[item.status] = item._count._all
    return acc
  }, {})

  return {
    total,
    emDia: quantidadePorStatus.em_dia || 0,
    pendentes: quantidadePorStatus.pendente || 0,
    inativos: quantidadePorStatus.inativo || 0
  }
}

// Criar cliente
export const criarCliente = async (req, res) => {
  try {
    const {
      nome,
      telefone,
      email,
      status,
      observacoes,
      whatsappOptIn
    } = req.body || {}

    if (!nome) {
      return res.status(400).json({
        error: "O campo nome é obrigatório"
      })
    }

    if (status && !statusPermitidosCliente.includes(status)) {
      return res.status(400).json({
        error: "Status inválido. Use 'em_dia', 'pendente' ou 'inativo'"
      })
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        telefone,
        email,
        status: status || "em_dia",
        observacoes,
        whatsappOptIn: whatsappOptIn !== false,
        empresaId: req.empresaId
      }
    })

    res.status(201).json(cliente)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao criar cliente" })
  }
}

// Listar clientes com busca, filtro e ordenação
export const listarClientes = async (req, res) => {
  try {
    const { busca, status, ordem } = req.query
    const { temPaginacao, page, limit, skip } = getPaginationParams(req.query)

    const where = {
      empresaId: req.empresaId
    }

    if (busca) {
      where.nome = {
        contains: busca,
        mode: "insensitive"
      }
    }

    if (status) {
      where.status = status
    }

    const queryClientes = {
      where,
      orderBy: {
        nome: ordem === "desc" ? "desc" : "asc"
      }
    }

    if (temPaginacao) {
      queryClientes.skip = skip
      queryClientes.take = limit
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany(queryClientes),
      temPaginacao ? prisma.cliente.count({ where }) : Promise.resolve(null)
    ])

    if (temPaginacao) {
      const summary = await montarResumoClientes(where, total)
      return res.json(montarRespostaPaginada({ data: clientes, total, page, limit, summary }))
    }

    res.json(clientes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao listar clientes" })
  }
}

//  Atualizar cliente
export const atualizarCliente = async (req, res) => {
  try {
    const { id } = req.params
    const {
      nome,
      telefone,
      email,
      status,
      observacoes,
      whatsappOptIn
    } = req.body || {}

    if (status && !statusPermitidosCliente.includes(status)) {
      return res.status(400).json({
        error: "Status inválido. Use 'em_dia', 'pendente' ou 'inativo'"
      })
    }

    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!clienteExistente) {
      return res.status(404).json({
        error: "Cliente não encontrado para esta empresa"
      })
    }

    const clienteAtualizado = await prisma.cliente.update({
      where: {
        id: Number(id)
      },
      data: {
        nome,
        telefone,
        email,
        status,
        observacoes,
        whatsappOptIn:
          whatsappOptIn === undefined ? undefined : Boolean(whatsappOptIn)
      }
    })

    res.json(clienteAtualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao atualizar cliente" })
  }
}

//  Deletar cliente
export const deletarCliente = async (req, res) => {
  try {
    const { id } = req.params

    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!clienteExistente) {
      return res.status(404).json({
        error: "Cliente não encontrado para esta empresa"
      })
    }

    const [vendas, contasReceber, agendamentos] = await Promise.all([
      prisma.venda.count({
        where: {
          clienteId: Number(id),
          empresaId: req.empresaId
        }
      }),
      prisma.contaReceber.count({
        where: {
          clienteId: Number(id),
          empresaId: req.empresaId
        }
      }),
      prisma.agendamento.count({
        where: {
          clienteId: Number(id),
          empresaId: req.empresaId
        }
      })
    ])

    const possuiHistorico = vendas > 0 || contasReceber > 0 || agendamentos > 0

    if (possuiHistorico) {
      const clienteInativado = await prisma.cliente.update({
        where: {
          id: Number(id)
        },
        data: {
          status: "inativo"
        }
      })

      return res.json({
        message: "Cliente possui histórico e foi inativado com sucesso",
        cliente: clienteInativado,
        inativado: true
      })
    }

    await prisma.cliente.delete({
      where: {
        id: Number(id)
      }
    })

    res.json({ message: "Cliente excluído com sucesso" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao deletar cliente" })
  }
}

export const detalharCliente = async (req, res) => {
  try {
    const { id } = req.params

    const cliente = await prisma.cliente.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente não encontrado para esta empresa"
      })
    }

    const vendas = await prisma.venda.findMany({
      where: {
        clienteId: Number(id),
        empresaId: req.empresaId
      },
      include: {
        itens: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })
    
    const contasReceber = await prisma.contaReceber.findMany({
      where: {
        clienteId: Number(id),
        empresaId: req.empresaId
      },
      include: {
        pagamentos: {
          orderBy: {
            createdAt: "desc"
          }
        },
        vendas: {
          include: {
            itens: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Buscar pagamentos diretamente com relação correta
    const pagamentos = await prisma.pagamentoContaReceber.findMany({
      where: {
        contaReceber: {
          clienteId: Number(id),
          empresaId: req.empresaId
        }
      },
      include: {
        contaReceber: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const totalComprado = vendas.reduce((total, venda) => {
      return total + Number(venda.totalFinal || 0)
    }, 0)

    const totalPago = contasReceber.reduce((total, conta) => {
      return total + Number(conta.valorPago || 0)
    }, 0)

    const totalEmAberto = contasReceber.reduce((total, conta) => {
      return total + (Number(conta.valorTotal || 0) - Number(conta.valorPago || 0))
    }, 0)

    const totalVencido = contasReceber
      .filter((conta) => conta.status === "vencido")
      .reduce((total, conta) => {
        return total + (Number(conta.valorTotal || 0) - Number(conta.valorPago || 0))
      }, 0)

    const produtosComprados = []
    const servicosRealizados = []

    for (const venda of vendas) {
      for (const item of venda.itens || []) {
        const itemFormatado = {
          vendaId: venda.id,
          nomeItem: item.nomeItem,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.subtotal,
          createdAt: venda.createdAt
        }

        if (item.tipoItem === "produto") {
          produtosComprados.push(itemFormatado)
        }

        if (item.tipoItem === "servico") {
          servicosRealizados.push(itemFormatado)
        }
      }
    }

    const historico = [
      {
        tipo: "cliente_cadastrado",
        titulo: "Cliente cadastrado",
        descricao: cliente.nome,
        valor: null,
        data: cliente.createdAt
      },

      ...vendas.map((venda) => ({
        tipo: "venda",
        titulo: `Venda #${venda.id}`,
        descricao: `${venda.itens?.length || 0} item(ns)`,
        valor: venda.totalFinal,
        data: venda.createdAt
      })),

      ...contasReceber.map((conta) => ({
        tipo: "conta_receber",
        titulo: conta.descricao || `Conta #${conta.id}`,
        descricao: `Status: ${conta.status}`,
        valor: Number(conta.valorTotal || 0) - Number(conta.valorPago || 0),
        data: conta.createdAt
      })),

      ...pagamentos.map((pagamento) => ({
        tipo: "pagamento",
        titulo: `Pagamento da conta`,
        descricao:
          pagamento.descricao ||
          pagamento.contaReceber.descricao ||
          "Pagamento recebido",
        valor: pagamento.valor,
        data: pagamento.createdAt
      }))
    ].sort((a, b) => new Date(b.data) - new Date(a.data))

    res.json({
      cliente,
      resumo: {
        totalComprado,
        totalPago,
        totalEmAberto,
        totalVencido,
        quantidadeVendas: vendas.length,
        quantidadeContas: contasReceber.length
      },
      vendas,
      produtosComprados,
      servicosRealizados,
      contasReceber,
      pagamentos,
      historico
    })
} catch (error) {
  console.error("Erro ao detalhar cliente:", error)

  res.status(500).json({
    error: "Erro ao detalhar cliente",
    detalhes: error.message
  })
}}
