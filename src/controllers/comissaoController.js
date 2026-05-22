import prisma from "../config/prisma.js"

const inicioDoMesAtual = () => {
  const agora = new Date()
  return new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0)
}

const fimDoMesAtual = () => {
  const agora = new Date()
  return new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999)
}

const parsePeriodo = (query = {}) => {
  const { dataInicio, dataFim } = query

  const inicio = dataInicio ? new Date(dataInicio) : inicioDoMesAtual()
  const fim = dataFim ? new Date(dataFim) : fimDoMesAtual()

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    const erro = new Error("Periodo invalido")
    erro.statusCode = 400
    throw erro
  }

  if (dataInicio) inicio.setHours(0, 0, 0, 0)
  if (dataFim) fim.setHours(23, 59, 59, 999)

  if (inicio > fim) {
    const erro = new Error("Data inicial nao pode ser maior que a data final")
    erro.statusCode = 400
    throw erro
  }

  return { inicio, fim }
}

const calcularComissaoDoUsuario = async ({ empresaId, usuario, inicio, fim }) => {
  const percPadrao = Number(usuario.comissaoPercentualPadrao ?? 0)

  const comissoes = await prisma.comissao.findMany({
    where: {
      empresaId,
      usuarioId: usuario.id,
      status: {
        not: "cancelada"
      },
      createdAt: {
        gte: inicio,
        lte: fim
      }
    },
    include: {
      venda: {
        include: {
          cliente: { select: { id: true, nome: true } }
        }
      },
      agendamento: {
        include: {
          cliente: { select: { id: true, nome: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  let totalServicos = 0
  let totalProdutos = 0
  let comissaoServicos = 0
  let comissaoProdutos = 0

  const itensComissao = comissoes.map((comissao) => {
    const valor = Number(comissao.valorBase || 0)
    const valorComissao = Number(comissao.valorComissao || 0)
    const origem = comissao.agendamentoId ? "agendamento" : "venda"
    const cliente =
      comissao.agendamento?.cliente?.nome ||
      comissao.venda?.cliente?.nome ||
      null

    if (comissao.tipo === "produto") {
      totalProdutos += valor
      comissaoProdutos += valorComissao
    } else {
      totalServicos += valor
      comissaoServicos += valorComissao
    }

    return {
      origem,
      tipo: comissao.tipo,
      comissaoId: comissao.id,
      agendamentoId: comissao.agendamentoId,
      vendaId: comissao.vendaId,
      data: comissao.createdAt,
      descricao: comissao.descricao || "Comissão",
      cliente,
      valor,
      percentual: Number(comissao.percentual || 0),
      comissao: valorComissao,
      status: comissao.status,
      dataPagamento: comissao.dataPagamento
    }
  })

  return {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo,
      comissaoPercentualPadrao: percPadrao
    },
    periodo: { inicio, fim },
    totais: {
      totalServicos,
      totalProdutos,
      totalVendido: totalServicos + totalProdutos,
      comissaoServicos,
      comissaoProdutos,
      comissaoTotal: comissaoServicos + comissaoProdutos
    },
    itens: itensComissao
  }
}

// GET /comissoes/me — funcionário logado
export const minhasComissoes = async (req, res) => {
  try {
    if (!req.usuarioId) {
      return res.status(400).json({
        error: "Login como empresa não possui comissões"
      })
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id: req.usuarioId, empresaId: req.empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        comissaoPercentualPadrao: true
      }
    })

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    const { inicio, fim } = parsePeriodo(req.query)

    const dados = await calcularComissaoDoUsuario({
      empresaId: req.empresaId,
      usuario,
      inicio,
      fim
    })

    res.json(dados)
  } catch (error) {
    console.error("Erro ao calcular comissões do usuário logado:", error)
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    res.status(500).json({ error: "Erro ao calcular comissões" })
  }
}

// GET /comissoes — admin
export const listarComissoesEquipe = async (req, res) => {
  try {
    const { inicio, fim } = parsePeriodo(req.query)

    const usuarios = await prisma.usuario.findMany({
      where: {
        empresaId: req.empresaId,
        status: "ativo"
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        role: true,
        comissaoPercentualPadrao: true
      },
      orderBy: { nome: "asc" }
    })

    const resultados = await Promise.all(
      usuarios.map((usuario) =>
        calcularComissaoDoUsuario({
          empresaId: req.empresaId,
          usuario,
          inicio,
          fim
        })
      )
    )

    res.json({
      periodo: { inicio, fim },
      funcionarios: resultados
    })
  } catch (error) {
    console.error("Erro ao listar comissões da equipe:", error)
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    res.status(500).json({ error: "Erro ao listar comissões da equipe" })
  }
}

// GET /comissoes/usuario/:id — admin
export const comissoesPorUsuario = async (req, res) => {
  try {
    const { id } = req.params

    const usuario = await prisma.usuario.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        comissaoPercentualPadrao: true
      }
    })

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    const { inicio, fim } = parsePeriodo(req.query)

    const dados = await calcularComissaoDoUsuario({
      empresaId: req.empresaId,
      usuario,
      inicio,
      fim
    })

    res.json(dados)
  } catch (error) {
    console.error("Erro ao calcular comissões do usuário:", error)
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    res.status(500).json({ error: "Erro ao calcular comissões" })
  }
}
