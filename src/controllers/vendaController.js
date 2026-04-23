import prisma from "../config/prisma.js"

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
      vencimento,
      descricaoConta
    } = req.body || {}

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        error: "A venda precisa ter pelo menos 1 item"
      })
    }

    let totalBruto = 0
    const itensProcessados = []

    for (const item of itens) {
      const { tipoItem, referenciaId, quantidade } = item

      if (!tipoItem || !referenciaId || !quantidade) {
        return res.status(400).json({
          error: "Cada item precisa ter tipoItem, referenciaId e quantidade"
        })
      }

      let registro = null
      let nomeItem = ""
      let precoUnitario = 0

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

        nomeItem = registro.nome
        precoUnitario =
          tipoPreco === "atacado" && registro.precoAtacado
            ? Number(registro.precoAtacado)
            : Number(registro.precoVarejo)
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
      }

      if (!registro) {
        return res.status(400).json({
          error: `tipoItem inválido: ${tipoItem}`
        })
      }

      const subtotal = Number(quantidade) * Number(precoUnitario)
      totalBruto += subtotal

      itensProcessados.push({
        tipoItem,
        referenciaId: Number(referenciaId),
        nomeItem,
        quantidade: Number(quantidade),
        precoUnitario: Number(precoUnitario),
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

    // Regra: sem cliente, só pode venda totalmente paga
    if (!clienteId && valorPagoFinal < totalFinal) {
      return res.status(400).json({
        error: "Venda sem cliente só pode ser finalizada com pagamento total"
      })
    }

    // Se houve pagamento, forma de pagamento é obrigatória
    if (valorPagoFinal > 0 && !formaPagamento) {
      return res.status(400).json({
        error: "Forma de pagamento é obrigatória quando houver valor pago"
      })
    }

    // Se existir cliente informado, validar se pertence à empresa
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

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          clienteId: clienteId ? Number(clienteId) : null,
          empresaId: req.empresaId,
          tipoPreco: tipoPreco || "varejo",
          desconto: Number(descontoFinal),
          totalBruto: Number(totalBruto),
          totalFinal: Number(totalFinal),
          status: "fechada",
          itens: {
            create: itensProcessados
          }
        },
        include: {
          itens: true
        }
      })

      let transacao = null
      let contaReceber = null

      // Se pagou algo, cria transação financeira
      if (valorPagoFinal > 0) {
        transacao = await tx.transacao.create({
          data: {
            tipo: "entrada",
            valor: Number(valorPagoFinal),
            categoria: "venda",
            descricao: `Venda #${novaVenda.id}`,
            formaPagamento: formaPagamento || null,
            status: "ativa",
            empresaId: req.empresaId
          }
        })
      }

      // Se sobrou algo e tem cliente, cria conta a receber
      if (valorRestante > 0 && clienteId) {
        const dataVencimento = vencimento ? new Date(vencimento) : null

        let statusConta = "pendente"
        if (valorPagoFinal > 0 && valorPagoFinal < totalFinal) {
          statusConta = "parcial"
        }

        contaReceber = await tx.contaReceber.create({
          data: {
            clienteId: Number(clienteId),
            empresaId: req.empresaId,
            descricao:
              descricaoConta ||
              `Saldo restante da venda #${novaVenda.id}`,
            valorTotal: Number(totalFinal),
            valorPago: Number(valorPagoFinal),
            status: statusConta,
            vencimento: dataVencimento
          }
        })

        // se houve entrada parcial, também registra em pagamentoContaReceber
        if (valorPagoFinal > 0) {
          await tx.pagamentoContaReceber.create({
            data: {
              contaReceberId: contaReceber.id,
              empresaId: req.empresaId,
              valor: Number(valorPagoFinal),
              formaPagamento: formaPagamento || null,
              descricao: `Entrada inicial da venda #${novaVenda.id}`
            }
          })
        }

        // atualiza status do cliente
        const contasDoCliente = await tx.contaReceber.findMany({
          where: {
            clienteId: Number(clienteId),
            empresaId: req.empresaId
          }
        })

        const temPendencia = contasDoCliente.some(
          (conta) =>
            conta.status === "pendente" ||
            conta.status === "parcial" ||
            conta.status === "vencido"
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
        contaReceberGerada: contaReceber
      }
    })

    res.status(201).json(venda)
  } catch (error) {
    console.error(error)
    res.status(500).json({
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
        itens: true
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