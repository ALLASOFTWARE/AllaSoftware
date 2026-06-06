import prisma from "../config/prisma.js"
import { obterUsoMensalWhatsApp } from "../services/whatsappService.js"

const inicioDoDia = (data) => {
  const novaData = new Date(data)
  novaData.setHours(0, 0, 0, 0)
  return novaData
}

const fimDoDia = (data) => {
  const novaData = new Date(data)
  novaData.setHours(23, 59, 59, 999)
  return novaData
}

const formatarContaReceber = (conta) => ({
  id: conta.id,
  cliente: conta.cliente?.nome || "Sem cliente",
  descricao: conta.descricao,
  valorTotal: conta.valorTotal,
  valorPago: conta.valorPago,
  saldoRestante: Number(conta.valorTotal || 0) - Number(conta.valorPago || 0),
  vencimento: conta.vencimento,
  status: conta.status
})

const formatarContaPagar = (conta) => ({
  id: conta.id,
  descricao: conta.descricao,
  categoria: conta.categoria,
  valorTotal: conta.valorTotal,
  valorPago: conta.valorPago,
  saldoRestante: Number(conta.valorTotal || 0) - Number(conta.valorPago || 0),
  vencimento: conta.vencimento,
  status: conta.status
})

const montarAlerta = ({
  id,
  tipo,
  titulo,
  descricao,
  prioridade = "info",
  quantidade = 0,
  valor = null,
  href = null,
  itens = [],
  metadata = {}
}) => ({
  id,
  tipo,
  titulo,
  descricao,
  prioridade,
  quantidade,
  valor,
  href,
  itens,
  metadata
})

export const alertasVencimento = async (req, res) => {
  try {
    const hoje = new Date()
    const hojeInicio = inicioDoDia(hoje)
    const hojeFim = fimDoDia(hoje)

    const tresDias = new Date()
    tresDias.setDate(hoje.getDate() + 3)
    const tresDiasFim = fimDoDia(tresDias)

    const whereBase = {
      empresaId: req.empresaId,
      status: {
        in: ["pendente", "parcial", "vencido"]
      },
      vencimento: {
        not: null
      }
    }

    const contas = await prisma.contaReceber.findMany({
      where: whereBase,
      include: {
        cliente: true
      },
      orderBy: {
        vencimento: "asc"
      }
    })

    const vencidas = contas
      .filter((conta) => new Date(conta.vencimento) < hojeInicio)
      .map((conta) => ({
        id: conta.id,
        cliente: conta.cliente.nome,
        descricao: conta.descricao,
        valorTotal: conta.valorTotal,
        valorPago: conta.valorPago,
        saldoRestante: conta.valorTotal - conta.valorPago,
        vencimento: conta.vencimento,
        status: conta.status
      }))

    const vencemHoje = contas
      .filter((conta) => {
        const vencimento = new Date(conta.vencimento)
        return vencimento >= hojeInicio && vencimento <= hojeFim
      })
      .map((conta) => ({
        id: conta.id,
        cliente: conta.cliente.nome,
        descricao: conta.descricao,
        valorTotal: conta.valorTotal,
        valorPago: conta.valorPago,
        saldoRestante: conta.valorTotal - conta.valorPago,
        vencimento: conta.vencimento,
        status: conta.status
      }))

    const vencemEmBreve = contas
      .filter((conta) => {
        const vencimento = new Date(conta.vencimento)
        return vencimento > hojeFim && vencimento <= tresDiasFim
      })
      .map((conta) => ({
        id: conta.id,
        cliente: conta.cliente.nome,
        descricao: conta.descricao,
        valorTotal: conta.valorTotal,
        valorPago: conta.valorPago,
        saldoRestante: conta.valorTotal - conta.valorPago,
        vencimento: conta.vencimento,
        status: conta.status
      }))

    res.json({
      vencidas,
      vencemHoje,
      vencemEmBreve
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao gerar alertas de vencimento"
    })
  }
}

export const alertasOperacionais = async (req, res) => {
  try {
    const agora = new Date()
    const hojeInicio = inicioDoDia(agora)
    const hojeFim = fimDoDia(agora)
    const LIMITE_ESTOQUE_BAIXO = 5

    const [
      contasReceberVencidas,
      contasPagarVencidas,
      agendamentosHoje,
      produtosEstoqueBaixo,
      clientesPendentes,
      whatsappConfig,
      mensagensWhatsAppErro
    ] = await Promise.all([
      prisma.contaReceber.findMany({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["pendente", "parcial", "vencido"]
          },
          vencimento: {
            lt: hojeInicio
          }
        },
        include: {
          cliente: true
        },
        orderBy: {
          vencimento: "asc"
        },
        take: 8
      }),
      prisma.contaPagar.findMany({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["pendente", "parcial", "vencido"]
          },
          vencimento: {
            lt: hojeInicio
          }
        },
        orderBy: {
          vencimento: "asc"
        },
        take: 8
      }),
      prisma.agendamento.findMany({
        where: {
          empresaId: req.empresaId,
          status: "agendado",
          dataHora: {
            gte: hojeInicio,
            lte: hojeFim
          }
        },
        include: {
          cliente: {
            select: {
              id: true,
              nome: true,
              telefone: true
            }
          },
          profissional: {
            select: {
              id: true,
              nome: true
            }
          },
          servico: {
            select: {
              id: true,
              nome: true
            }
          }
        },
        orderBy: {
          dataHora: "asc"
        },
        take: 8
      }),
      prisma.produto.findMany({
        where: {
          empresaId: req.empresaId,
          status: "ativo",
          estoque: {
            not: null,
            lte: LIMITE_ESTOQUE_BAIXO
          }
        },
        orderBy: [
          {
            estoque: "asc"
          },
          {
            nome: "asc"
          }
        ],
        take: 8
      }),
      prisma.cliente.findMany({
        where: {
          empresaId: req.empresaId,
          status: "pendente"
        },
        orderBy: {
          nome: "asc"
        },
        take: 8
      }),
      prisma.empresaWhatsApp.findUnique({
        where: {
          empresaId: req.empresaId
        }
      }),
      prisma.mensagemWhatsApp.findMany({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["erro", "bloqueado_limite"]
          }
        },
        include: {
          cliente: {
            select: {
              id: true,
              nome: true
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 5
      })
    ])

    const [
      totalReceberVencidas,
      totalPagarVencidas,
      totalAgendamentosHoje,
      totalProdutosEstoqueBaixo,
      totalClientesPendentes,
      valoresReceberVencidas,
      valoresPagarVencidas,
      usoWhatsApp,
      totalMensagensWhatsAppErro
    ] = await Promise.all([
      prisma.contaReceber.count({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["pendente", "parcial", "vencido"]
          },
          vencimento: {
            lt: hojeInicio
          }
        }
      }),
      prisma.contaPagar.count({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["pendente", "parcial", "vencido"]
          },
          vencimento: {
            lt: hojeInicio
          }
        }
      }),
      prisma.agendamento.count({
        where: {
          empresaId: req.empresaId,
          status: "agendado",
          dataHora: {
            gte: hojeInicio,
            lte: hojeFim
          }
        }
      }),
      prisma.produto.count({
        where: {
          empresaId: req.empresaId,
          status: "ativo",
          estoque: {
            not: null,
            lte: LIMITE_ESTOQUE_BAIXO
          }
        }
      }),
      prisma.cliente.count({
        where: {
          empresaId: req.empresaId,
          status: "pendente"
        }
      }),
      prisma.contaReceber.aggregate({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["pendente", "parcial", "vencido"]
          },
          vencimento: {
            lt: hojeInicio
          }
        },
        _sum: {
          valorTotal: true,
          valorPago: true
        }
      }),
      prisma.contaPagar.aggregate({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["pendente", "parcial", "vencido"]
          },
          vencimento: {
            lt: hojeInicio
          }
        },
        _sum: {
          valorTotal: true,
          valorPago: true
        }
      }),
      whatsappConfig ? obterUsoMensalWhatsApp(req.empresaId, whatsappConfig) : Promise.resolve(null),
      prisma.mensagemWhatsApp.count({
        where: {
          empresaId: req.empresaId,
          status: {
            in: ["erro", "bloqueado_limite"]
          }
        }
      })
    ])

    const totalValorReceberVencido =
      Number(valoresReceberVencidas._sum.valorTotal || 0) -
      Number(valoresReceberVencidas._sum.valorPago || 0)
    const totalValorPagarVencido =
      Number(valoresPagarVencidas._sum.valorTotal || 0) -
      Number(valoresPagarVencidas._sum.valorPago || 0)

    const alertas = []

    if (totalReceberVencidas > 0) {
      alertas.push(montarAlerta({
        id: "contas-receber-vencidas",
        tipo: "contas_receber",
        titulo: "Contas a receber vencidas",
        descricao: "Cobrancas de clientes precisam de acompanhamento.",
        prioridade: "critico",
        quantidade: totalReceberVencidas,
        valor: totalValorReceberVencido,
        href: "/contas-receber?status=vencido",
        itens: contasReceberVencidas.map(formatarContaReceber)
      }))
    }

    if (totalPagarVencidas > 0) {
      alertas.push(montarAlerta({
        id: "contas-pagar-vencidas",
        tipo: "contas_pagar",
        titulo: "Contas a pagar vencidas",
        descricao: "Despesas vencidas podem impactar o financeiro.",
        prioridade: "critico",
        quantidade: totalPagarVencidas,
        valor: totalValorPagarVencido,
        href: "/contas-pagar?status=vencido",
        itens: contasPagarVencidas.map(formatarContaPagar)
      }))
    }

    if (totalAgendamentosHoje > 0) {
      alertas.push(montarAlerta({
        id: "agendamentos-hoje",
        tipo: "agendamentos",
        titulo: "Agendamentos de hoje",
        descricao: "Agenda do dia para confirmar atendimento e preparacao.",
        prioridade: "info",
        quantidade: totalAgendamentosHoje,
        href: "/agendamentos",
        itens: agendamentosHoje.map((agendamento) => ({
          id: agendamento.id,
          titulo: agendamento.titulo,
          dataHora: agendamento.dataHora,
          cliente: agendamento.cliente?.nome || "Sem cliente",
          profissional: agendamento.profissional?.nome || "-",
          servico: agendamento.servico?.nome || "-"
        }))
      }))
    }

    if (totalProdutosEstoqueBaixo > 0) {
      alertas.push(montarAlerta({
        id: "estoque-baixo",
        tipo: "estoque",
        titulo: "Produtos com estoque baixo",
        descricao: `Itens ativos com ${LIMITE_ESTOQUE_BAIXO} unidades ou menos.`,
        prioridade: "atencao",
        quantidade: totalProdutosEstoqueBaixo,
        href: "/produtos",
        itens: produtosEstoqueBaixo.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          estoque: produto.estoque,
          precoVarejo: produto.precoVarejo
        })),
        metadata: {
          limiteEstoqueBaixo: LIMITE_ESTOQUE_BAIXO
        }
      }))
    }

    if (totalClientesPendentes > 0) {
      alertas.push(montarAlerta({
        id: "clientes-pendentes",
        tipo: "clientes",
        titulo: "Clientes com pendencias",
        descricao: "Clientes marcados como pendentes no financeiro.",
        prioridade: "atencao",
        quantidade: totalClientesPendentes,
        href: "/clientes?status=pendente",
        itens: clientesPendentes.map((cliente) => ({
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          email: cliente.email
        }))
      }))
    }

    if (usoWhatsApp && usoWhatsApp.percentual >= 80) {
      const prioridadeWhatsApp =
        usoWhatsApp.percentual >= 100
          ? "critico"
          : usoWhatsApp.percentual >= 95
          ? "atencao"
          : "info"

      alertas.push(montarAlerta({
        id: "whatsapp-limite",
        tipo: "whatsapp",
        titulo: "WhatsApp perto do limite",
        descricao:
          usoWhatsApp.percentual >= 100
            ? "Limite mensal atingido. Configure excedente para continuar enviando."
            : `Uso mensal chegou a ${usoWhatsApp.percentual}%.`,
        prioridade: prioridadeWhatsApp,
        quantidade: usoWhatsApp.usadas,
        href: "/whatsapp",
        metadata: {
          limite: usoWhatsApp.limite,
          usadas: usoWhatsApp.usadas,
          restantes: usoWhatsApp.restantes,
          excedentes: usoWhatsApp.excedentes,
          percentual: usoWhatsApp.percentual,
          permitirExcedente: usoWhatsApp.permitirExcedente,
          bloqueado: usoWhatsApp.bloqueado
        }
      }))
    }

    if (totalMensagensWhatsAppErro > 0) {
      alertas.push(montarAlerta({
        id: "whatsapp-erros",
        tipo: "whatsapp_erros",
        titulo: "Mensagens WhatsApp com erro",
        descricao: "Algumas mensagens nao foram enviadas corretamente.",
        prioridade: "atencao",
        quantidade: totalMensagensWhatsAppErro,
        href: "/whatsapp",
        itens: mensagensWhatsAppErro.map((mensagem) => ({
          id: mensagem.id,
          tipo: mensagem.tipo,
          cliente: mensagem.cliente?.nome || "Sem cliente",
          destino: mensagem.destino,
          status: mensagem.status,
          erro: mensagem.erro,
          updatedAt: mensagem.updatedAt
        }))
      }))
    }

    const pesoPrioridade = {
      critico: 0,
      atencao: 1,
      info: 2
    }

    alertas.sort((a, b) => {
      const pesoA = pesoPrioridade[a.prioridade] ?? 9
      const pesoB = pesoPrioridade[b.prioridade] ?? 9
      if (pesoA !== pesoB) return pesoA - pesoB
      return b.quantidade - a.quantidade
    })

    res.json({
      resumo: {
        total: alertas.length,
        criticos: alertas.filter((alerta) => alerta.prioridade === "critico").length,
        atencao: alertas.filter((alerta) => alerta.prioridade === "atencao").length,
        informativos: alertas.filter((alerta) => alerta.prioridade === "info").length
      },
      alertas
    })
  } catch (error) {
    console.error("Erro ao gerar alertas operacionais:", error)
    res.status(500).json({
      error: "Erro ao gerar alertas operacionais"
    })
  }
}
