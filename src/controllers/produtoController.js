import prisma from "../config/prisma.js"

const numeroOpcionalParaCriacao = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null
  return Number(valor)
}

const numeroOpcionalParaAtualizacao = (valor) => {
  if (valor === undefined) return undefined
  if (valor === null || valor === "") return null
  return Number(valor)
}

// Criar produto
export const criarProduto = async (req, res) => {
  try {
    const { nome, descricao, precoVarejo, precoAtacado, precoCusto, estoque, status, comissaoPercentual } = req.body || {}

    if (!nome || precoVarejo === undefined) {
      return res.status(400).json({
        error: "Os campos nome e precoVarejo são obrigatórios"
      })
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        descricao,
        precoVarejo: Number(precoVarejo),
        precoAtacado: numeroOpcionalParaCriacao(precoAtacado),
        precoCusto: numeroOpcionalParaCriacao(precoCusto),
        estoque: numeroOpcionalParaCriacao(estoque),
        status: status || "ativo",
        comissaoPercentual:
          comissaoPercentual !== undefined &&
          comissaoPercentual !== null &&
          comissaoPercentual !== ""
            ? Number(comissaoPercentual)
            : null,
        empresaId: req.empresaId
      }
    })

    res.status(201).json(produto)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao criar produto"
    })
  }
}

// Listar produtos
export const listarProdutos = async (req, res) => {
  try {
    const { busca, status, ordem } = req.query

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

    const produtos = await prisma.produto.findMany({
      where,
      orderBy: {
        nome: ordem === "desc" ? "desc" : "asc"
      }
    })

    res.json(produtos)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao listar produtos"
    })
  }
}

// Atualizar produto
export const atualizarProduto = async (req, res) => {
  try {
    const { id } = req.params
    const { nome, descricao, precoVarejo, precoAtacado, precoCusto, estoque, status, comissaoPercentual } = req.body || {}

    const produtoExistente = await prisma.produto.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!produtoExistente) {
      return res.status(404).json({
        error: "Produto não encontrado"
      })
    }

    const produtoAtualizado = await prisma.produto.update({
      where: {
        id: Number(id)
      },
      data: {
        nome,
        descricao,
        precoVarejo: precoVarejo !== undefined ? Number(precoVarejo) : undefined,
        precoAtacado: numeroOpcionalParaAtualizacao(precoAtacado),
        estoque: numeroOpcionalParaAtualizacao(estoque),
        precoCusto: numeroOpcionalParaAtualizacao(precoCusto),
        status,
        comissaoPercentual:
          comissaoPercentual === undefined
            ? undefined
            : comissaoPercentual === null || comissaoPercentual === ""
            ? null
            : Number(comissaoPercentual)
      }
    })

    res.json(produtoAtualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao atualizar produto"
    })
  }
}

// Excluir produto
export const excluirProduto = async (req, res) => {
  try {
    const { id } = req.params

    const produtoExistente = await prisma.produto.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!produtoExistente) {
      return res.status(404).json({
        error: "Produto não encontrado"
      })
    }

    await prisma.produto.delete({
      where: {
        id: Number(id)
      }
    })

    res.json({
      message: "Produto excluído com sucesso"
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao excluir produto"
    })
  }
}
