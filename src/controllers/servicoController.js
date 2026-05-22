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

// Criar serviço
export const criarServico = async (req, res) => {
  try {
    const { nome, descricao, preco, duracao, status, comissaoPercentual } = req.body || {}

    if (!nome || preco === undefined) {
      return res.status(400).json({
        error: "Os campos nome e preco são obrigatórios"
      })
    }

    const servico = await prisma.servico.create({
      data: {
        nome,
        descricao,
        preco: Number(preco),
        duracao: numeroOpcionalParaCriacao(duracao),
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

    res.status(201).json(servico)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao criar serviço"
    })
  }
}

// Listar serviços
export const listarServicos = async (req, res) => {
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

    const servicos = await prisma.servico.findMany({
      where,
      orderBy: {
        nome: ordem === "desc" ? "desc" : "asc"
      }
    })

    res.json(servicos)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao listar serviços"
    })
  }
}

// Atualizar serviço
export const atualizarServico = async (req, res) => {
  try {
    const { id } = req.params
    const { nome, descricao, preco, duracao, status, comissaoPercentual } = req.body || {}

    const servicoExistente = await prisma.servico.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!servicoExistente) {
      return res.status(404).json({
        error: "Serviço não encontrado"
      })
    }

    const servicoAtualizado = await prisma.servico.update({
      where: {
        id: Number(id)
      },
      data: {
        nome,
        descricao,
        preco: preco !== undefined ? Number(preco) : undefined,
        duracao: numeroOpcionalParaAtualizacao(duracao),
        status,
        comissaoPercentual:
          comissaoPercentual === undefined
            ? undefined
            : comissaoPercentual === null || comissaoPercentual === ""
            ? null
            : Number(comissaoPercentual)
      }
    })

    res.json(servicoAtualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao atualizar serviço"
    })
  }
}

// Excluir serviço
export const excluirServico = async (req, res) => {
  try {
    const { id } = req.params

    const servicoExistente = await prisma.servico.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!servicoExistente) {
      return res.status(404).json({
        error: "Serviço não encontrado"
      })
    }

    await prisma.servico.delete({
      where: {
        id: Number(id)
      }
    })

    res.json({
      message: "Serviço excluído com sucesso"
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao excluir serviço"
    })
  }
}
