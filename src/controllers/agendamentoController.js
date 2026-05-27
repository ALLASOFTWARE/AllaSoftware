import prisma from "../config/prisma.js"
import { criarComissao } from "../services/comissaoService.js"
import { enviarMensagemAgendamento } from "../services/whatsappService.js"

const statusPermitidos = ["agendado", "concluido", "cancelado"]

const buscarServicoDaEmpresa = async ({ servicoId, empresaId }) => {
  if (!servicoId) return null

  return await prisma.servico.findFirst({
    where: {
      id: Number(servicoId),
      empresaId,
      status: "ativo"
    }
  })
}

const buscarClienteDaEmpresa = async ({ clienteId, empresaId }) => {
  if (!clienteId) return null

  return await prisma.cliente.findFirst({
    where: {
      id: Number(clienteId),
      empresaId,
      status: {
        not: "inativo"
      }
    }
  })
}

const buscarProfissionalDaEmpresa = async ({ profissionalId, empresaId }) => {
  if (!profissionalId) return null

  return await prisma.usuario.findFirst({
    where: {
      id: Number(profissionalId),
      empresaId,
      status: "ativo"
    }
  })
}

// Criar agendamento
export const criarAgendamento = async (req, res) => {
  try {
    const {
      clienteId,
      servicoId,
      profissionalId,
      titulo,
      descricao,
      dataHora,
      status,
      observacoes
    } = req.body || {}

    if (!titulo) {
      return res.status(400).json({
        error: "O título do agendamento é obrigatório"
      })
    }

    if (!dataHora) {
      return res.status(400).json({
        error: "A data e hora do agendamento são obrigatórias"
      })
    }

    if (req.role !== "admin" && !profissionalId) {
      return res.status(400).json({
        error: "Selecione um profissional para o agendamento"
      })
    }

    if (status && !statusPermitidos.includes(status)) {
      return res.status(400).json({
        error: "Status inválido"
      })
    }

    if (status === "concluido") {
      return res.status(400).json({
        error: "Use a rota de conclusão para concluir o agendamento"
      })
    }

    const cliente = await buscarClienteDaEmpresa({
      clienteId,
      empresaId: req.empresaId
    })

    if (clienteId && !cliente) {
      return res.status(404).json({
        error: "Cliente não encontrado para esta empresa"
      })
    }

    const servico = await buscarServicoDaEmpresa({
      servicoId,
      empresaId: req.empresaId
    })

    if (servicoId && !servico) {
      return res.status(404).json({
        error: "Serviço não encontrado para esta empresa"
      })
    }

    const profissional = await buscarProfissionalDaEmpresa({
      profissionalId,
      empresaId: req.empresaId
    })

    if (profissionalId && !profissional) {
      return res.status(404).json({
        error: "Profissional não encontrado ou inativo"
      })
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        clienteId: clienteId ? Number(clienteId) : null,
        servicoId: servicoId ? Number(servicoId) : null,
        profissionalId: profissionalId ? Number(profissionalId) : null,
        empresaId: req.empresaId,

        titulo,
        descricao: descricao || null,
        dataHora: new Date(dataHora),
        status: status || "agendado",
        valorServico: servico ? Number(servico.preco || 0) : null,
        observacoes: observacoes || null
      },
      include: {
        cliente: true,
        servico: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            role: true,
            status: true
          }
        },
        venda: true
      }
    })

    enviarMensagemAgendamento({
      empresaId: req.empresaId,
      agendamento,
      tipo: "confirmacao"
    }).catch((error) => {
      console.error("Erro ao enviar confirmacao WhatsApp:", error)
    })

    res.status(201).json(agendamento)
  } catch (error) {
    console.error("Erro ao criar agendamento:", error)

    res.status(500).json({
      error: "Erro ao criar agendamento"
    })
  }
}

// Listar agendamentos
export const listarAgendamentos = async (req, res) => {
  try {
    const {
      status,
      clienteId,
      profissionalId,
      dataInicio,
      dataFim
    } = req.query

    const where = {
      empresaId: req.empresaId
    }

    if (status) {
      where.status = status
    }

    if (clienteId) {
      where.clienteId = Number(clienteId)
    }

    if (profissionalId) {
      where.profissionalId = Number(profissionalId)
    }

    if (dataInicio || dataFim) {
      where.dataHora = {}

      if (dataInicio) {
        where.dataHora.gte = new Date(dataInicio)
      }

      if (dataFim) {
        const fim = new Date(dataFim)
        fim.setHours(23, 59, 59, 999)
        where.dataHora.lte = fim
      }
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        cliente: true,
        servico: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            role: true,
            status: true
          }
        },
        venda: true
      },
      orderBy: {
        dataHora: "asc"
      }
    })

    res.json(agendamentos)
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error)

    res.status(500).json({
      error: "Erro ao listar agendamentos"
    })
  }
}

// Atualizar agendamento
export const atualizarAgendamento = async (req, res) => {
  try {
    const { id } = req.params

    const {
      clienteId,
      servicoId,
      profissionalId,
      titulo,
      descricao,
      dataHora,
      status,
      observacoes
    } = req.body || {}

    if (status && !statusPermitidos.includes(status)) {
      return res.status(400).json({
        error: "Status inválido"
      })
    }

    if (status === "concluido") {
      return res.status(400).json({
        error: "Use a rota de conclusão para concluir o agendamento"
      })
    }

    const agendamentoExistente = await prisma.agendamento.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!agendamentoExistente) {
      return res.status(404).json({
        error: "Agendamento não encontrado para esta empresa"
      })
    }

    if (
      req.role !== "admin" &&
      profissionalId !== undefined &&
      (profissionalId === null || profissionalId === "")
    ) {
      return res.status(400).json({
        error: "Selecione um profissional para o agendamento"
      })
    }

    let servico = null

    if (servicoId !== undefined && servicoId !== null && servicoId !== "") {
      servico = await buscarServicoDaEmpresa({
        servicoId,
        empresaId: req.empresaId
      })

      if (!servico) {
        return res.status(404).json({
          error: "Serviço não encontrado para esta empresa"
        })
      }
    }

    if (clienteId !== undefined && clienteId !== null && clienteId !== "") {
      const cliente = await buscarClienteDaEmpresa({
        clienteId,
        empresaId: req.empresaId
      })

      if (!cliente) {
        return res.status(404).json({
          error: "Cliente não encontrado para esta empresa"
        })
      }
    }

    if (
      profissionalId !== undefined &&
      profissionalId !== null &&
      profissionalId !== ""
    ) {
      const profissional = await buscarProfissionalDaEmpresa({
        profissionalId,
        empresaId: req.empresaId
      })

      if (!profissional) {
        return res.status(404).json({
          error: "Profissional não encontrado ou inativo"
        })
      }
    }

    const dados = {
      clienteId:
        clienteId === null || clienteId === ""
          ? null
          : clienteId !== undefined
          ? Number(clienteId)
          : undefined,

      servicoId:
        servicoId === null || servicoId === ""
          ? null
          : servicoId !== undefined
          ? Number(servicoId)
          : undefined,

      profissionalId:
        profissionalId === null || profissionalId === ""
          ? null
          : profissionalId !== undefined
          ? Number(profissionalId)
          : undefined,

      titulo: titulo !== undefined ? titulo : undefined,

      descricao:
        descricao === null || descricao === ""
          ? null
          : descricao !== undefined
          ? descricao
          : undefined,

      dataHora: dataHora ? new Date(dataHora) : undefined,

      status: status !== undefined ? status : undefined,

      observacoes:
        observacoes === null || observacoes === ""
          ? null
          : observacoes !== undefined
          ? observacoes
          : undefined
    }

    if (servicoId !== undefined) {
      dados.valorServico = servico ? Number(servico.preco || 0) : null
    }

    if (status === "concluido" && agendamentoExistente.status !== "concluido") {
      dados.concluidoEm = new Date()
    }

    if (status && status !== "concluido" && agendamentoExistente.status === "concluido") {
      dados.concluidoEm = null
    }

    const agendamentoAtualizado = await prisma.agendamento.update({
      where: {
        id: Number(id)
      },
      data: dados,
      include: {
        cliente: true,
        servico: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            role: true,
            status: true
          }
        },
        venda: true
      }
    })

    res.json(agendamentoAtualizado)
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error)

    res.status(500).json({
      error: "Erro ao atualizar agendamento",
      detalhes: error.message
    })
  }
}

// Excluir agendamento
export const excluirAgendamento = async (req, res) => {
  try {
    const { id } = req.params

    const agendamentoExistente = await prisma.agendamento.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!agendamentoExistente) {
      return res.status(404).json({
        error: "Agendamento não encontrado para esta empresa"
      })
    }

    if (agendamentoExistente.vendaId) {
      return res.status(400).json({
        error: "Este agendamento já possui venda vinculada e não pode ser excluído"
      })
    }

    if (agendamentoExistente.status === "concluido" || agendamentoExistente.concluidoEm) {
      return res.status(400).json({
        error: "Agendamento concluído não pode ser excluído para preservar o histórico"
      })
    }

    await prisma.agendamento.delete({
      where: {
        id: Number(id)
      }
    })

    res.json({
      message: "Agendamento excluído com sucesso"
    })
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error)

    res.status(500).json({
      error: "Erro ao excluir agendamento"
    })
  }
}

export const concluirAgendamento = async (req, res) => {
  try {
    const { id } = req.params

    const {
      valorPago = 0,
      formaPagamento = null,
      fiado = false,
      vencimento = null,
      observacoesPagamento = null
    } = req.body || {}

    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        venda: true
      }
    })

    if (!agendamento) {
      return res.status(404).json({
        error: "Agendamento não encontrado para esta empresa"
      })
    }

    if (agendamento.status === "cancelado") {
      return res.status(400).json({
        error: "Agendamento cancelado não pode ser concluído"
      })
    }

    if (agendamento.vendaId) {
      return res.status(400).json({
        error: "Este agendamento já foi concluído e possui venda vinculada"
      })
    }

    if (!agendamento.clienteId) {
      return res.status(400).json({
        error: "Para concluir o agendamento, selecione um cliente"
      })
    }

    if (!agendamento.servicoId || !agendamento.servico) {
      return res.status(400).json({
        error: "Para concluir o agendamento, selecione um serviço"
      })
    }

    if (!agendamento.profissionalId) {
      return res.status(400).json({
        error: "Para concluir o agendamento, selecione um profissional"
      })
    }

    const valorServico = Number(
      agendamento.valorServico ?? agendamento.servico.preco ?? 0
    )

    if (valorServico <= 0) {
      return res.status(400).json({
        error: "O serviço precisa ter um valor válido para concluir"
      })
    }

    const pagarDepois = fiado === true || fiado === "true"
    const valorPagoInformado = Number(valorPago || 0)
    const valorPagoNumero =
      pagarDepois && valorPagoInformado >= valorServico ? 0 : valorPagoInformado

    if (valorPagoNumero < 0) {
      return res.status(400).json({
        error: "O valor pago não pode ser negativo"
      })
    }

    if (valorPagoNumero > valorServico) {
      return res.status(400).json({
        error: "O valor pago não pode ser maior que o valor do serviço"
      })
    }

    if (valorPagoNumero > 0 && !formaPagamento) {
      return res.status(400).json({
        error: "Informe a forma de pagamento"
      })
    }

    const saldoEmAberto = valorServico - valorPagoNumero
    const deveCriarContaReceber = pagarDepois || saldoEmAberto > 0

    const resultado = await prisma.$transaction(async (tx) => {
      let contaReceber = null

      if (deveCriarContaReceber) {
        contaReceber = await tx.contaReceber.create({
          data: {
            clienteId: agendamento.clienteId,
            empresaId: req.empresaId,
            descricao: `Agendamento #${agendamento.id} - ${agendamento.servico.nome}`,
            valorTotal: valorServico,
            valorPago: valorPagoNumero,
            status:
              valorPagoNumero > 0 && saldoEmAberto > 0
                ? "parcial"
                : "pendente",
            vencimento: vencimento ? new Date(vencimento) : null
          }
        })

        if (valorPagoNumero > 0) {
          await tx.pagamentoContaReceber.create({
            data: {
              contaReceberId: contaReceber.id,
              empresaId: req.empresaId,
              valor: valorPagoNumero,
              formaPagamento,
              descricao:
                observacoesPagamento ||
                `Pagamento parcial do agendamento #${agendamento.id}`
            }
          })
        }
      }

      const venda = await tx.venda.create({
        data: {
          clienteId: agendamento.clienteId,
          empresaId: req.empresaId,
          contaReceberId: contaReceber ? contaReceber.id : null,
          vendedorId: req.usuarioId || null,
          tipoPreco: "varejo",
          desconto: 0,
          totalBruto: valorServico,
          totalFinal: valorServico,
          status: "fechada",
          itens: {
            create: [
              {
                tipoItem: "servico",
                referenciaId: agendamento.servico.id,
                nomeItem: agendamento.servico.nome,
                quantidade: 1,
                precoUnitario: valorServico,
                subtotal: valorServico,
                custoUnitario: null,
                custoTotal: null,
                lucroBruto: valorServico
              }
            ]
          }
        },
        include: {
          itens: true,
          contaReceber: true
        }
      })

      await criarComissao({
        tx,
        empresaId: req.empresaId,
        usuarioId: agendamento.profissionalId,
        vendaId: venda.id,
        agendamentoId: agendamento.id,
        tipo: "servico",
        descricao: agendamento.servico.nome,
        valorBase: valorServico,
        percentualItem: agendamento.servico.comissaoPercentual,
        percentualPadrao: agendamento.profissional?.comissaoPercentualPadrao
      })

      if (valorPagoNumero > 0) {
        await tx.transacao.create({
          data: {
            tipo: "entrada",
            valor: valorPagoNumero,
            categoria: "Serviço",
            descricao: `Pagamento do agendamento #${agendamento.id} - ${agendamento.servico.nome}`,
            formaPagamento,
            status: "ativa",
            empresaId: req.empresaId
          }
        })
      }

      const agendamentoAtualizado = await tx.agendamento.update({
        where: {
          id: agendamento.id
        },
        data: {
          status: "concluido",
          vendaId: venda.id,
          valorServico,
          concluidoEm: new Date()
        },
        include: {
          cliente: true,
          servico: true,
          profissional: {
            select: {
              id: true,
              nome: true,
              email: true,
              cargo: true,
              role: true,
              status: true
            }
          },
          venda: {
            include: {
              itens: true,
              contaReceber: true
            }
          }
        }
      })

      return {
        agendamento: agendamentoAtualizado,
        venda,
        contaReceber,
        valorPago: valorPagoNumero,
        saldoEmAberto
      }
    })

    res.json({
      message: "Agendamento concluído com sucesso",
      ...resultado
    })
  } catch (error) {
    console.error("Erro ao concluir agendamento:", error)

    res.status(500).json({
      error: "Erro ao concluir agendamento",
      detalhes: error.message
    })
  }
}
