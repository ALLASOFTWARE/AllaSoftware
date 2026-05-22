import prisma from "../config/prisma.js"
import { gerarComprovanteTransacaoCancelada, imprimirTermico } from "../services/comprovanteService.js"

const CATEGORIAS_TRANSACOES = {
  entrada: [
    "Serviço",
    "Produto",
    "Venda",
    "Pagamento de cliente",
    "Estorno",
    "Outro"
  ],
  saida: [
    "Produto/Estoque",
    "Material",
    "Aluguel",
    "Conta fixa",
    "Marketing",
    "Comissão",
    "Pagamento funcionário",
    "Manutenção",
    "Estorno",
    "Outro"
  ]
}

const categoriaValida = (tipo, categoria) => {
  if (!categoria) return true

  return CATEGORIAS_TRANSACOES[tipo]?.includes(categoria)
} 

//  Criar transação
export const criarTransacao = async (req, res) => {
  try {
    const { tipo, valor, categoria, descricao, formaPagamento } = req.body || {}

    if (!tipo || valor === undefined) {
      return res.status(400).json({
        error: "Os campos tipo e valor são obrigatórios"
      })
    }

    if (tipo !== "entrada" && tipo !== "saida") {
      return res.status(400).json({
        error: "O tipo deve ser 'entrada' ou 'saida'"
      })
    }

    if (!categoriaValida(tipo, categoria)) {
      return res.status(400).json({
        error: "Categoria inválida para este tipo de transação"
      })
    }
    const transacao = await prisma.transacao.create({
      data: {
        tipo,
        valor: Number(valor),
        categoria,
        descricao,
        formaPagamento,
        empresaId: req.empresaId
      }
    })

    res.status(201).json(transacao)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao criar transação"
    })
  }
}

// Listar transações
export const listarTransacoes = async (req, res) => {
  try {
    const { status, periodo, categoria, tipo } = req.query

    const agora = new Date()
    let dataInicial = null

    if (periodo === "hoje") {
      dataInicial = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate(),
        0, 0, 0, 0
      )
    }

    if (periodo === "7dias") {
      dataInicial = new Date()
      dataInicial.setDate(agora.getDate() - 7)
    }

    if (periodo === "mes") {
      dataInicial = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1,
        0, 0, 0, 0
      )
    }

    const where = {
      empresaId: req.empresaId,
      status: status || "ativa"
    }

    if (categoria) {
      where.categoria = categoria
    }

    if (tipo) {
      where.tipo = tipo
    }

    if (dataInicial) {
      where.createdAt = {
        gte: dataInicial
      }
    }

    const transacoes = await prisma.transacao.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      }
    })

    res.json(transacoes)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao listar transações"
    })
  }
}

// Resumo financeiro
export const resumoFinanceiro = async (req, res) => {
  try {
    const { periodo, categoria } = req.query

    const agora = new Date()
    let dataInicial = null

    if (periodo === "hoje") {
      dataInicial = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate(),
        0, 0, 0, 0
      )
    }

    if (periodo === "7dias") {
      dataInicial = new Date()
      dataInicial.setDate(agora.getDate() - 7)
    }

    if (periodo === "mes") {
      dataInicial = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1,
        0, 0, 0, 0
      )
    }

    const where = {
      empresaId: req.empresaId,
      status: "ativa"
    }

    if (categoria) {
      where.categoria = categoria
    }

    if (dataInicial) {
      where.createdAt = {
        gte: dataInicial
      }
    }

    const transacoes = await prisma.transacao.findMany({
      where
    })

    const totalEntradas = transacoes
      .filter((transacao) => transacao.tipo === "entrada")
      .reduce((total, transacao) => total + transacao.valor, 0)

    const totalSaidas = transacoes
      .filter((transacao) => transacao.tipo === "saida")
      .reduce((total, transacao) => total + transacao.valor, 0)

    const lucro = totalEntradas - totalSaidas

    res.json({
      periodo: periodo || "geral",
      categoria: categoria || "todas",
      totalEntradas,
      totalSaidas,
      lucro
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao gerar resumo financeiro"
    })
  }
}

//  Atualizar transação
export const atualizarTransacao = async (req, res) => {
  try {
    const { id } = req.params
    const { tipo, valor, categoria, descricao, formaPagamento  } = req.body || {}

    if (tipo && tipo !== "entrada" && tipo !== "saida") {
      return res.status(400).json({
        error: "O tipo deve ser 'entrada' ou 'saida'"
      })
    }


    const transacaoExistente = await prisma.transacao.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId,
        status: "ativa"
      }
    })

    if (!transacaoExistente) {
      return res.status(404).json({
        error: "Transação ativa não encontrada para esta empresa"
      })
    }   
    
    const tipoFinal = tipo || transacaoExistente?.tipo

    if (!categoriaValida(tipoFinal, categoria)) {
      return res.status(400).json({
        error: "Categoria inválida para este tipo de transação"
      })
    }


    const transacaoAtualizada = await prisma.transacao.update({
      where: {
        id: Number(id)
      },
      data: {
        tipo,
        valor: valor !== undefined ? Number(valor) : undefined,
        categoria,
        descricao,formaPagamento
      }
    })

    res.json(transacaoAtualizada)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao atualizar transação"
    })
  }
}

// Cancelar transação
export const cancelarTransacao = async (req, res) => {
  try {
    const { id } = req.params

    const transacaoExistente = await prisma.transacao.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId,
        status: "ativa"
      }
    })

    if (!transacaoExistente) {
      return res.status(404).json({
        error: "Transação ativa não encontrada para esta empresa"
      })
    }

    const transacaoCancelada = await prisma.transacao.update({
      where: {
        id: Number(id)
      },
      data: {
        status: "cancelada"
      }
    })

    const respostaCancelamento = {
      message: "Transação cancelada com sucesso",
      transacao: transacaoCancelada
    }

    try {
      const { texto } = await gerarComprovanteTransacaoCancelada(
        { transacaoOriginal: transacaoCancelada, tipo: "cancelamento" },
        { nome: process.env.EMPRESA_NOME }
      )
      await imprimirTermico(texto)
      res.json(respostaCancelamento)
    } catch (errComprovante) {
      console.error("[Comprovante] Cancelamento:", errComprovante)
      res.json(respostaCancelamento)
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao cancelar transação"
    })
  }
}

//  Estornar transação
export const estornarTransacao = async (req, res) => {
  try {
    const { id } = req.params

    const transacaoOriginal = await prisma.transacao.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId,
        status: "ativa"
      }
    })

    if (!transacaoOriginal) {
      return res.status(404).json({
        error: "Transação ativa não encontrada para esta empresa"
      })
    }

    const tipoEstorno =
      transacaoOriginal.tipo === "entrada" ? "saida" : "entrada"

    const transacaoEstorno = await prisma.transacao.create({
      data: {
        tipo: tipoEstorno,
        valor: transacaoOriginal.valor,
        categoria: "Estorno",
        descricao: `Estorno da transação ${transacaoOriginal.id}`,
        status: "ativa",
        empresaId: req.empresaId
      }
    })

    const originalAtualizada = await prisma.transacao.update({
      where: {
        id: transacaoOriginal.id
      },
      data: {
        status: "estornada"
      }
    })

    const respostaEstorno = {
      message: "Transação estornada com sucesso",
      transacaoOriginal: originalAtualizada,
      transacaoEstorno
    }

    try {
      const { texto } = await gerarComprovanteTransacaoCancelada(
        { transacaoOriginal: originalAtualizada, transacaoEstorno, tipo: "estorno" },
        { nome: process.env.EMPRESA_NOME }
      )
      await imprimirTermico(texto)
      res.json(respostaEstorno)
    } catch (errComprovante) {
      console.error("[Comprovante] Estorno:", errComprovante)
      res.json(respostaEstorno)
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao estornar transação"
    })
  }
}

export const listarCategoriasTransacoes = async (req, res) => {
  try {
    res.json(CATEGORIAS_TRANSACOES)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: "Erro ao listar categorias"
    })
  }
}
