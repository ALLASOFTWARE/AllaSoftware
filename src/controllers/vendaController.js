import prisma from "../config/prisma.js"
import { gerarComprovanteVenda, imprimirTermico } from "../services/comprovanteService.js"
import { criarComissao } from "../services/comissaoService.js"

const calcularStatusConta = (valorTotal, valorPago, vencimento) => {
  if (valorPago >= valorTotal) return "pago"

  const agora = new Date()

  if (vencimento && new Date(vencimento) < agora) {
    return "vencido"
  }

  if (valorPago > 0) return "parcial"

  return "pendente"
}

const getPeriodoMes = (data = new Date()) => {
  const inicio = new Date(data.getFullYear(), data.getMonth(), 1, 0, 0, 0, 0)
  const fim = new Date(
    data.getFullYear(),
    data.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  return { inicio, fim }
}

const obterOuCriarContaMensal = async ({
  tx,
  clienteId,
  empresaId,
  totalFinal,
  valorPago,
  vencimento
}) => {
  const hoje = new Date()
  const { inicio, fim } = getPeriodoMes(hoje)

  let conta = await tx.contaReceber.findFirst({
    where: {
      clienteId: Number(clienteId),
      empresaId,
      status: {
        in: ["pendente", "parcial", "vencido"]
      },
      createdAt: {
        gte: inicio,
        lte: fim
      }
    }
  })

  const dataVencimento =
    vencimento ||
    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999)

  if (!conta) {
    return await tx.contaReceber.create({
      data: {
        clienteId: Number(clienteId),
        empresaId,
        descricao: `Conta mensal - ${String(hoje.getMonth() + 1).padStart(
          2,
          "0"
        )}/${hoje.getFullYear()}`,
        valorTotal: Number(totalFinal),
        valorPago: Number(valorPago),
        status: calcularStatusConta(
          Number(totalFinal),
          Number(valorPago),
          dataVencimento
        ),
        vencimento: dataVencimento
      }
    })
  }

  const novoValorTotal = Number(conta.valorTotal) + Number(totalFinal)
  const novoValorPago = Number(conta.valorPago) + Number(valorPago)

  return await tx.contaReceber.update({
    where: {
      id: conta.id
    },
    data: {
      valorTotal: novoValorTotal,
      valorPago: novoValorPago,
      status: calcularStatusConta(
        novoValorTotal,
        novoValorPago,
        conta.vencimento
      )
    }
  })
}

// Criar venda
export const criarVenda = async (req, res) => {
  try {
    const {
      clienteId,
      tipoPreco,
      desconto,
      itens,
      formaPagamento,
      valorPago,
      vencimento
    } = req.body || {}

   const itensRecebidos = Array.isArray(itens) ? itens : []

    let totalBruto = 0
    const itensProcessados = []

    for (const item of itensRecebidos) {
      const { tipoItem, referenciaId, quantidade } = item

      if (!tipoItem || !referenciaId || !quantidade) {
        return res.status(400).json({
          error: "Cada item precisa ter tipoItem, referenciaId e quantidade"
        })
      }

      let registro = null
      let nomeItem = ""
      let precoUnitario = 0
      let custoUnitario = null

      if (tipoItem === "produto") {
        registro = await prisma.produto.findFirst({
          where: {
            id: Number(referenciaId),
            empresaId: req.empresaId,
            status: "ativo"
          }
        })

        if (!registro) {
          return res.status(404).json({
            error: `Produto ${referenciaId} não encontrado`
          })
        }

        if (
          registro.estoque !== null &&
          registro.estoque !== undefined &&
          Number(registro.estoque) < Number(quantidade)
        ) {
          return res.status(400).json({
            error: `Estoque insuficiente para o produto ${registro.nome}. Disponível: ${registro.estoque}`
          })
        } 

        nomeItem = registro.nome

        precoUnitario =
          tipoPreco === "atacado" && registro.precoAtacado
            ? Number(registro.precoAtacado)
            : Number(registro.precoVarejo)

        custoUnitario = registro.precoCusto !== null && registro.precoCusto !== undefined
          ? Number(registro.precoCusto)
          : null
      }

      if (tipoItem === "servico") {
        registro = await prisma.servico.findFirst({
          where: {
            id: Number(referenciaId),
            empresaId: req.empresaId,
            status: "ativo"
          }
        })

        if (!registro) {
          return res.status(404).json({
            error: `Serviço ${referenciaId} não encontrado`
          })
        }

        nomeItem = registro.nome
        precoUnitario = Number(registro.preco)
        custoUnitario = null
      }

      if (!registro) {
        return res.status(400).json({
          error: `tipoItem inválido: ${tipoItem}`
        })
      }

      const subtotal = Number(quantidade) * Number(precoUnitario)
      totalBruto += subtotal

      const custoTotal = custoUnitario !== null ? Number(custoUnitario) * Number(quantidade) : null

      const lucroBruto = custoTotal !== null ? Number(subtotal) - Number(custoTotal) : Number(subtotal)

      itensProcessados.push({
        tipoItem,
        referenciaId: Number(referenciaId),
        nomeItem,
        quantidade: Number(quantidade),
        precoUnitario: Number(precoUnitario),
        custoUnitario,
        custoTotal,
        lucroBruto,
        comissaoPercentual: registro.comissaoPercentual,
        produtoEstoqueControlado: 
          tipoItem === "produto" && registro.estoque !== null && registro.estoque !== undefined,
        subtotal: Number(subtotal)
      })
    }

    const descontoFinal = Number(desconto || 0)
    const totalFinal = Number(totalBruto) - Number(descontoFinal)
    const valorPagoFinal = Number(valorPago || 0)
    const valorRestante = Number(totalFinal) - Number(valorPagoFinal)

    if (totalFinal < 0) {
      return res.status(400).json({
        error: "O desconto não pode ser maior que o total da venda"
      })
    }

    if (valorPagoFinal < 0) {
      return res.status(400).json({
        error: "O valor pago não pode ser negativo"
      })
    }

    if (valorPagoFinal > totalFinal) {
      return res.status(400).json({
        error: "O valor pago não pode ser maior que o total da venda"
      })
    }

    if (!clienteId && valorPagoFinal < totalFinal) {
      return res.status(400).json({
        error: "Venda sem cliente só pode ser finalizada com pagamento total"
      })
    }

    if (clienteId) {
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
    }

    const vendedor = req.usuarioId
      ? await prisma.usuario.findFirst({
          where: {
            id: req.usuarioId,
            empresaId: req.empresaId
          },
          select: {
            id: true,
            comissaoPercentualPadrao: true
          }
        })
      : null

    const venda = await prisma.$transaction(async (tx) => {
      let contaMensal = null

      if (valorRestante > 0 && clienteId) {
        contaMensal = await obterOuCriarContaMensal({
          tx,
          clienteId,
          empresaId: req.empresaId,
          totalFinal,
          valorPago: valorPagoFinal,
          vencimento: vencimento ? new Date(vencimento) : null
        })
      }

      const itensParaCriar = itensProcessados.map(
        ({ produtoEstoqueControlado, comissaoPercentual, ...item}) => item
      )
 
      const novaVenda = await tx.venda.create({
        data: {
          clienteId: clienteId ? Number(clienteId) : null,
          empresaId: req.empresaId,
          contaReceberId: contaMensal ? contaMensal.id : null,
          vendedorId: req.usuarioId || null,
          tipoPreco: tipoPreco || "varejo",
          desconto: Number(descontoFinal),
          totalBruto: Number(totalBruto),
          totalFinal: Number(totalFinal),
          status: "fechada",
          itens: {
            create: itensParaCriar
          }
        },
        include: {
          itens: true,
          contaReceber: true
        }
      })

      for (const item of itensProcessados) {
        if (item.tipoItem === "produto" && item.produtoEstoqueControlado) {
          await tx.produto.update({
            where: {
              id: item.referenciaId
            },
            data: {
              estoque: {
                decrement: item.quantidade
              }
            }
          })
        }
      }

      let transacao = null

      if (valorPagoFinal > 0) {
        transacao = await tx.transacao.create({
          data: {
            tipo: "entrada",
            valor: Number(valorPagoFinal),
            categoria: "Venda",
            descricao: `Pagamento da venda #${novaVenda.id}`,
            formaPagamento: formaPagamento || null,
            status: "ativa",
            empresaId: req.empresaId
          }
        })
      }

      if (vendedor) {
        for (const item of itensProcessados) {
          await criarComissao({
            tx,
            empresaId: req.empresaId,
            usuarioId: vendedor.id,
            vendaId: novaVenda.id,
            tipo: item.tipoItem,
            descricao: item.nomeItem,
            valorBase: item.subtotal,
            percentualItem: item.comissaoPercentual,
            percentualPadrao: vendedor.comissaoPercentualPadrao
          })
        }
      }

      if (contaMensal && valorPagoFinal > 0) {
        await tx.pagamentoContaReceber.create({
          data: {
            contaReceberId: contaMensal.id,
            empresaId: req.empresaId,
            valor: Number(valorPagoFinal),
            formaPagamento: formaPagamento || null,
            descricao: `Entrada da venda #${novaVenda.id}`
          }
        })
      }

      if (clienteId) {
        const contasDoCliente = await tx.contaReceber.findMany({
          where: {
            clienteId: Number(clienteId),
            empresaId: req.empresaId
          }
        })

        const temPendencia = contasDoCliente.some((conta) =>
          ["pendente", "parcial", "vencido"].includes(conta.status)
        )

        await tx.cliente.update({
          where: {
            id: Number(clienteId)
          },
          data: {
            status: temPendencia ? "pendente" : "em_dia"
          }
        })
      }

      return {
        ...novaVenda,
        transacaoFinanceira: transacao,
        contaReceberGerada: contaMensal
      }
    })

    try {
      const empresa = { nome: process.env.EMPRESA_NOME, cnpj: process.env.EMPRESA_CNPJ }
      const { pdf, texto } = await gerarComprovanteVenda(venda, empresa)
      await imprimirTermico(texto, pdf)          // imprime na térmica se configurada
      res.status(201).json(venda)
    } 
    catch (errComprovante) {
      console.error("[Comprovante] Venda:", errComprovante)
      res.status(201).json(venda)           // venda salva; comprovante falhou → não interrompe
    }

  } catch (error) {
    console.error(error)
    res.status(500)
    .json({
      error: "Erro ao criar venda"
    })
  }
}

// Listar vendas
export const listarVendas = async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: {
        empresaId: req.empresaId
      },
      include: {
        itens: true,
        contaReceber: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    res.json(vendas)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao listar vendas"
    })
  }
}
