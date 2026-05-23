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

const calcularResumoVendas = (itensVenda) => {
  const faturamentoVendas = itensVenda.reduce((total, item) => {
    return total + Number(item.subtotal || 0)
  }, 0)

  const custoProdutosVendidos = itensVenda.reduce((total, item) => {
    return total + Number(item.custoTotal || 0)
  }, 0)

  const lucroBrutoVendas = itensVenda.reduce((total, item) => {
    return total + Number(item.lucroBruto || 0)
  }, 0)

  return {
    faturamentoVendas,
    custoProdutosVendidos,
    lucroBrutoVendas
  }
}

const formatarDia = (data) => {
  return data.toISOString().slice(0, 10)
}

const obterEscopoProfissional = async (req) => {
  if (req.role !== "admin") {
    return req.usuarioId ? Number(req.usuarioId) : null
  }

  const { profissionalId } = req.query || {}

  if (!profissionalId || profissionalId === "empresa") {
    return null
  }

  const profissional = await prisma.usuario.findFirst({
    where: {
      id: Number(profissionalId),
      empresaId: req.empresaId,
      status: "ativo",
      profissional: true
    },
    select: {
      id: true,
      nome: true
    }
  })

  if (!profissional) {
    const error = new Error("Profissional não encontrado")
    error.statusCode = 404
    throw error
  }

  return profissional.id
}

const criarWhereVendaProfissional = ({ empresaId, profissionalId, dataInicial }) => {
  const where = {
    empresaId,
    OR: [
      { vendedorId: profissionalId },
      { agendamento: { is: { profissionalId } } }
    ]
  }

  if (dataInicial) {
    where.createdAt = {
      gte: dataInicial
    }
  }

  return where
}

const calcularValorRecebidoVenda = (venda) => {
  if (!venda.contaReceber) {
    return Number(venda.totalFinal || 0)
  }

  const valorTotalConta = Number(venda.contaReceber.valorTotal || 0)
  const valorPagoConta = Number(venda.contaReceber.valorPago || 0)

  if (valorTotalConta <= 0 || valorPagoConta <= 0) {
    return 0
  }

  const proporcaoPaga = Math.min(valorPagoConta / valorTotalConta, 1)
  return Number(venda.totalFinal || 0) * proporcaoPaga
}

const calcularResumoProfissional = (vendas, itensVenda) => {
  const entradas = vendas.reduce((total, venda) => {
    return total + calcularValorRecebidoVenda(venda)
  }, 0)

  const saidas = itensVenda.reduce((total, item) => {
    return total + Number(item.custoTotal || 0)
  }, 0)

  return {
    entradas,
    saidas,
    lucro: entradas - saidas
  }
}

const montarTransacoesProfissional = (vendas) => {
  return vendas.slice(0, 5).map((venda) => ({
    id: venda.id,
    tipo: "entrada",
    valor: calcularValorRecebidoVenda(venda),
    categoria: venda.agendamento ? "Serviço" : "Venda",
    descricao: venda.agendamento
      ? `Agendamento #${venda.agendamento.id}`
      : `Venda #${venda.id}`,
    formaPagamento: null,
    status: "ativa",
    empresaId: venda.empresaId,
    createdAt: venda.createdAt
  }))
}

export const dashboardFinanceiro = async (req, res) => {
  try {
    const profissionalIdEscopo = await obterEscopoProfissional(req)

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

    if (profissionalIdEscopo) {
      const selectProfissional = await prisma.usuario.findFirst({
        where: {
          id: profissionalIdEscopo,
          empresaId: req.empresaId
        },
        select: {
          id: true,
          nome: true
        }
      })

      const vendaInclude = {
        contaReceber: true,
        agendamento: {
          select: {
            id: true,
            profissionalId: true
          }
        }
      }

      const vendaWhereHoje = criarWhereVendaProfissional({
        empresaId: req.empresaId,
        profissionalId: profissionalIdEscopo,
        dataInicial: inicioHoje
      })

      const vendaWhereSeteDias = criarWhereVendaProfissional({
        empresaId: req.empresaId,
        profissionalId: profissionalIdEscopo,
        dataInicial: inicioSeteDias
      })

      const vendaWhereMes = criarWhereVendaProfissional({
        empresaId: req.empresaId,
        profissionalId: profissionalIdEscopo,
        dataInicial: inicioMes
      })

      const [vendasHoje, vendasSeteDias, vendasMes, itensVendaHoje, itensVendaSeteDias, itensVendaMes] =
        await Promise.all([
          prisma.venda.findMany({
            where: vendaWhereHoje,
            include: vendaInclude,
            orderBy: { createdAt: "desc" }
          }),
          prisma.venda.findMany({
            where: vendaWhereSeteDias,
            include: vendaInclude,
            orderBy: { createdAt: "desc" }
          }),
          prisma.venda.findMany({
            where: vendaWhereMes,
            include: vendaInclude,
            orderBy: { createdAt: "desc" }
          }),
          prisma.itemVenda.findMany({
            where: {
              venda: vendaWhereHoje
            },
            include: {
              venda: true
            }
          }),
          prisma.itemVenda.findMany({
            where: {
              venda: vendaWhereSeteDias
            },
            include: {
              venda: true
            }
          }),
          prisma.itemVenda.findMany({
            where: {
              venda: vendaWhereMes
            },
            include: {
              venda: true
            }
          })
        ])

      const contasMap = new Map()

      vendasMes.forEach((venda) => {
        if (venda.contaReceber) {
          contasMap.set(venda.contaReceber.id, venda.contaReceber)
        }
      })

      const contasEscopo = Array.from(contasMap.values())
      const contasPendentes = contasEscopo.filter((conta) => conta.status === "pendente").length
      const contasParciais = contasEscopo.filter((conta) => conta.status === "parcial").length
      const contasPagas = contasEscopo.filter((conta) => conta.status === "pago").length
      const contasVencidas = contasEscopo.filter((conta) => conta.status === "vencido").length
      const totalEmAberto = contasEscopo
        .filter((conta) => ["pendente", "parcial", "vencido"].includes(conta.status))
        .reduce((total, conta) => total + (Number(conta.valorTotal || 0) - Number(conta.valorPago || 0)), 0)
      const totalVencido = contasEscopo
        .filter((conta) => conta.status === "vencido")
        .reduce((total, conta) => total + (Number(conta.valorTotal || 0) - Number(conta.valorPago || 0)), 0)

      const resumoHojeCaixa = calcularResumoProfissional(vendasHoje, itensVendaHoje)
      const resumoSeteDiasCaixa = calcularResumoProfissional(vendasSeteDias, itensVendaSeteDias)
      const resumoMesCaixa = calcularResumoProfissional(vendasMes, itensVendaMes)

      const resumoHojeVendas = calcularResumoVendas(itensVendaHoje)
      const resumoSeteDiasVendas = calcularResumoVendas(itensVendaSeteDias)
      const resumoMesVendas = calcularResumoVendas(itensVendaMes)

      const grafico7Dias = []

      for (let i = 0; i < 7; i++) {
        const inicioDia = new Date(inicioSeteDias)
        inicioDia.setDate(inicioSeteDias.getDate() + i)
        inicioDia.setHours(0, 0, 0, 0)

        const fimDia = new Date(inicioDia)
        fimDia.setHours(23, 59, 59, 999)

        const vendasDoDia = vendasSeteDias.filter((venda) => {
          const data = new Date(venda.createdAt)
          return data >= inicioDia && data <= fimDia
        })

        const itensVendaDoDia = itensVendaSeteDias.filter((item) => {
          const data = new Date(item.venda.createdAt)
          return data >= inicioDia && data <= fimDia
        })

        const resumoDia = calcularResumoProfissional(vendasDoDia, itensVendaDoDia)
        const resumoVendasDoDia = calcularResumoVendas(itensVendaDoDia)

        grafico7Dias.push({
          dia: formatarDia(inicioDia),
          entradas: resumoDia.entradas,
          saidas: resumoDia.saidas,
          lucro: resumoDia.lucro,
          saldoCaixa: resumoDia.lucro,
          lucroBrutoVendas: resumoVendasDoDia.lucroBrutoVendas,
          custoProdutosVendidos: resumoVendasDoDia.custoProdutosVendidos,
          faturamentoVendas: resumoVendasDoDia.faturamentoVendas
        })
      }

      const entradasMes = resumoMesCaixa.entradas
      const formasPagamento = entradasMes > 0 ? { recebido: entradasMes } : {}

      return res.json({
        escopo: {
          tipo: "profissional",
          profissional: selectProfissional
        },
        hoje: {
          ...resumoHojeCaixa,
          saldoCaixa: resumoHojeCaixa.lucro,
          ...resumoHojeVendas
        },
        seteDias: {
          ...resumoSeteDiasCaixa,
          saldoCaixa: resumoSeteDiasCaixa.lucro,
          ...resumoSeteDiasVendas
        },
        mes: {
          ...resumoMesCaixa,
          saldoCaixa: resumoMesCaixa.lucro,
          ...resumoMesVendas
        },
        clientesPendentes: 0,
        contasPendentes,
        contasParciais,
        contasPagas,
        contasVencidas,
        totalEmAberto,
        totalVencido,
        ultimasTransacoes: montarTransacoesProfissional(vendasMes),
        grafico7Dias,
        formasPagamento
      })
    }

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

    const itensVendaHoje = await prisma.itemVenda.findMany({
      where: {
        venda: {
          empresaId: req.empresaId,
          createdAt: {
            gte: inicioHoje
          }
        }
      },
      include: {
        venda: true
      }
    })

    const itensVendaSeteDias = await prisma.itemVenda.findMany({
      where: {
        venda: {
          empresaId: req.empresaId,
          createdAt: {
            gte: inicioSeteDias
          }
        }
      },
      include: {
        venda: true
      }
    })

    const itensVendaMes = await prisma.itemVenda.findMany({
      where: {
        venda: {
          empresaId: req.empresaId,
          createdAt: {
            gte: inicioMes
          }
        }
      },
      include: {
        venda: true
      }
    })

    const resumoHojeCaixa = calcularResumo(transacoesHoje)
    const resumoSeteDiasCaixa = calcularResumo(transacoesSeteDias)
    const resumoMesCaixa = calcularResumo(transacoesMes)

    const resumoHojeVendas = calcularResumoVendas(itensVendaHoje)
    const resumoSeteDiasVendas = calcularResumoVendas(itensVendaSeteDias)
    const resumoMesVendas = calcularResumoVendas(itensVendaMes)

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

      const itensVendaDoDia = itensVendaSeteDias.filter((item) => {
        const data = new Date(item.venda.createdAt)
        return data >= inicioDia && data <= fimDia
      })

      const resumoVendasDoDia = calcularResumoVendas(itensVendaDoDia)

      grafico7Dias.push({
        dia: formatarDia(inicioDia),
        entradas: resumoDia.entradas,
        saidas: resumoDia.saidas,
        lucro: resumoDia.lucro,
        saldoCaixa: resumoDia.lucro,
        lucroBrutoVendas: resumoVendasDoDia.lucroBrutoVendas,
        custoProdutosVendidos: resumoVendasDoDia.custoProdutosVendidos,
        faturamentoVendas: resumoVendasDoDia.faturamentoVendas
      })
    }

    res.json({
      hoje: { ...resumoHojeCaixa, 
        saldoCaixa: resumoHojeCaixa.lucro,
        ...resumoHojeVendas
      },
      seteDias: {
        ...resumoSeteDiasCaixa,
        saldoCaixa: resumoSeteDiasCaixa.lucro,
        ...resumoSeteDiasVendas
      },
      mes: {
        ...resumoMesCaixa,
        saldoCaixa: resumoMesCaixa.lucro,
        ...resumoMesVendas
      },
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.message
      })
    }

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

export const dashboardVendasSerie = async (req, res) => {
  try {
    const agora = new Date()
    const inicioSeteDias = new Date()
    inicioSeteDias.setDate(agora.getDate() - 6)
    inicioSeteDias.setHours(0, 0, 0, 0)

    const vendas = await prisma.venda.findMany({
      where: {
        empresaId: req.empresaId,
        createdAt: {
          gte: inicioSeteDias
        }
      },
      select: {
        totalFinal: true,
        createdAt: true
      }
    })

    const serie = []

    for (let i = 0; i < 7; i++) {
      const inicioDia = new Date(inicioSeteDias)
      inicioDia.setDate(inicioSeteDias.getDate() + i)
      inicioDia.setHours(0, 0, 0, 0)

      const fimDia = new Date(inicioDia)
      fimDia.setHours(23, 59, 59, 999)

      const total = vendas
        .filter((venda) => {
          const data = new Date(venda.createdAt)
          return data >= inicioDia && data <= fimDia
        })
        .reduce((acc, venda) => acc + Number(venda.totalFinal || 0), 0)

      serie.push({
        dia: formatarDia(inicioDia),
        total
      })
    }

    res.json(serie)
  } catch (error) {
    console.error("Erro ao carregar série de vendas:", error)

    res.status(500).json({
      error: "Erro ao carregar série de vendas"
    })
  }
}
