import prisma from "../config/prisma.js"
import bcrypt from "bcryptjs"

const permissoesPadraoFuncionario = {
  dashboard: {
    visualizar: true
  },
  clientes: {
    visualizar: true,
    criar: true,
    editar: true,
    excluir: false
  },
  servicos: {
    visualizar: true,
    criar: false,
    editar: false,
    excluir: false
  },
  produtos: {
    visualizar: true,
    criar: false,
    editar: false,
    excluir: false
  },
  vendas: {
    visualizar: true,
    criar: true,
    editar: false,
    excluir: false
  },
  contasReceber: {
    visualizar: true,
    criar: false,
    receberPagamento: true,
    editar: false,
    excluir: false
  },
  agendamentos: {
    visualizar: true,
    criar: true,
    editar: true,
    excluir: false
  },
  financeiro: {
    visualizar: false,
    criar: false,
    editar: false,
    excluir: false
  },
  relatorios: {
    visualizar: false
  },
  usuarios: {
    visualizar: false,
    criar: false,
    editar: false,
    excluir: false
  }
}

const permissoesAdmin = {
  dashboard: { visualizar: true },
  clientes: { visualizar: true, criar: true, editar: true, excluir: true },
  servicos: { visualizar: true, criar: true, editar: true, excluir: true },
  produtos: { visualizar: true, criar: true, editar: true, excluir: true },
  vendas: { visualizar: true, criar: true, editar: true, excluir: true },
  contasReceber: {
    visualizar: true,
    criar: true,
    receberPagamento: true,
    editar: true,
    excluir: true
  },
  agendamentos: { visualizar: true, criar: true, editar: true, excluir: true },
  financeiro: { visualizar: true, criar: true, editar: true, excluir: true },
  relatorios: { visualizar: true },
  usuarios: { visualizar: true, criar: true, editar: true, excluir: true }
}

const obterPermissoesPorRole = (role) => {
  return role === "admin" ? permissoesAdmin : permissoesPadraoFuncionario
}

// ─── Criar usuário ───────────────────────────────────────────
export const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, role, cargo, status, permissoes } = req.body || {}

    if (!nome || !email || !senha) {
      return res.status(400).json({
        error: "Os campos nome, email e senha são obrigatórios"
      })
    }

    if (role && !["admin", "funcionario"].includes(role)) {
      return res.status(400).json({
        error: "Role inválida. Use 'admin' ou 'funcionario'"
      })
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } })

    if (usuarioExistente) {
      return res.status(400).json({ error: "Já existe um usuário com esse email" })
    }

    const hash = await bcrypt.hash(senha, 10)

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hash,
        role: roleFinal,
        cargo: cargo || null,
        status: status || "ativo",
        permissoes: permissoes || obterPermissoesPorRole(roleFinal),
        empresaId: req.empresaId
      }
    })

    res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      cargo: usuario.cargo,
      status: usuario.status,
      permissoes: usuario.permissoes,
      empresaId: usuario.empresaId
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao criar usuário" })
  }
}

// ─── Listar usuários da empresa ──────────────────────────────
export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: req.empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        cargo: true,
        status: true,
        permissoes: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { nome: "asc" }
    })

    res.json(usuarios)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao listar usuários" })
  }
}

// ─── Deletar usuário ─────────────────────────────────────────
export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params

    if (Number(id) === Number(req.usuarioId)) {
      return res.status(400).json({
        error: "Você não pode excluir o próprio usuário logado"
      })
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id: Number(id), empresaId: req.empresaId }
    })

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado para esta empresa" })
    }

    await prisma.usuario.delete({ where: { id: Number(id) } })

    res.json({ message: "Usuário removido com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar usuário:", error)
    res.status(500).json({ error: "Erro ao deletar usuário" })
  }
}

export const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { nome, email, role, cargo, status, permissoes, senha } = req.body || {}

    if (role && !["admin", "funcionario"].includes(role)) {
      return res.status(400).json({
        error: "Role inválida. Use 'admin' ou 'funcionario'"
      })
    }

    if (status && !["ativo", "inativo"].includes(status)) {
      return res.status(400).json({
        error: "Status inválido. Use 'ativo' ou 'inativo'"
      })
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!usuarioExistente) {
      return res.status(404).json({
        error: "Usuário não encontrado para esta empresa"
      })
    }

    if (Number(id) === Number(req.usuarioId) && status === "inativo") {
      return res.status(400).json({
        error: "Você não pode desativar o próprio usuário logado"
      })
    }

    const dados = {}

    if (nome !== undefined) dados.nome = nome
    if (email !== undefined) dados.email = email
    if (role !== undefined) dados.role = role
    if (cargo !== undefined) dados.cargo = cargo || null
    if (status !== undefined) dados.status = status
    if (permissoes !== undefined) dados.permissoes = permissoes

    if (senha) {
      dados.senha = await bcrypt.hash(senha, 10)
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: {
        id: Number(id)
      },
      data: dados,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        cargo: true,
        status: true,
        permissoes: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json(usuarioAtualizado)
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Já existe um usuário com esse email"
      })
    }

    res.status(500).json({
      error: "Erro ao atualizar usuário"
    })
  }
}

export const alterarStatusUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}

    if (!["ativo", "inativo"].includes(status)) {
      return res.status(400).json({
        error: "Status inválido. Use 'ativo' ou 'inativo'"
      })
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: Number(id),
        empresaId: req.empresaId
      }
    })

    if (!usuarioExistente) {
      return res.status(404).json({
        error: "Usuário não encontrado para esta empresa"
      })
    }

    if (Number(id) === Number(req.usuarioId) && status === "inativo") {
      return res.status(400).json({
        error: "Você não pode desativar o próprio usuário logado"
      })
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: {
        id: Number(id)
      },
      data: {
        status
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        cargo: true,
        status: true,
        permissoes: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json(usuarioAtualizado)
  } catch (error) {
    console.error("Erro ao alterar status do usuário:", error)

    res.status(500).json({
      error: "Erro ao alterar status do usuário"
    })
  }
}

// ─── Ver perfil do usuário logado ───────────────────────────
export const verPerfil = async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: {
        id: req.empresaId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpfCnpj: true,
        celular: true,
        cep: true,
        rua: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        createdAt: true
      }
    })

    if (!empresa) {
      return res.status(404).json({
        error: "Empresa não encontrada"
      })
    }

    if (!req.usuarioId) {
      return res.json({
        tipo: "empresa",
        ...empresa,
        empresa
      })
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        id: req.usuarioId,
        empresaId: req.empresaId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado"
      })
    }

    res.json({
      tipo: "usuario",
      ...usuario,
      empresa
    })
  } catch (error) {
    console.error("Erro ao buscar perfil:", error)

    res.status(500).json({
      error: "Erro ao buscar perfil"
    })
  }
}

// ─── Atualizar perfil do usuário logado ─────────────────────
export const atualizarPerfil = async (req, res) => {
  try {
    const {
      nome,
      senhaAtual,
      novaSenha,

      empresaNome,
      cpfCnpj,
      celular,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    } = req.body || {}

    const camposEmpresaRecebidos = {
      nome: empresaNome,
      cpfCnpj,
      celular,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    }

    const deveAtualizarEmpresa = Object.values(camposEmpresaRecebidos).some(
      (valor) => valor !== undefined
    )

    // LOGIN COMO EMPRESA
    if (!req.usuarioId) {
      const empresa = await prisma.empresa.findUnique({
        where: {
          id: req.empresaId
        }
      })

      if (!empresa) {
        return res.status(404).json({
          error: "Empresa não encontrada"
        })
      }

      const dadosEmpresa = {}

      if (nome) {
        if (!senhaAtual) {
          return res.status(400).json({
            error: "Informe sua senha atual para alterar o nome"
          })
        }

        const senhaCorreta = await bcrypt.compare(senhaAtual, empresa.senha)

        if (!senhaCorreta) {
          return res.status(400).json({
            error: "Senha atual incorreta"
          })
        }

        dadosEmpresa.nome = nome
      }

      if (deveAtualizarEmpresa) {
        if (empresaNome !== undefined) dadosEmpresa.nome = empresaNome || null
        if (cpfCnpj !== undefined) dadosEmpresa.cpfCnpj = cpfCnpj || null
        if (celular !== undefined) dadosEmpresa.celular = celular || null
        if (cep !== undefined) dadosEmpresa.cep = cep || null
        if (rua !== undefined) dadosEmpresa.rua = rua || null
        if (numero !== undefined) dadosEmpresa.numero = numero || null
        if (complemento !== undefined) dadosEmpresa.complemento = complemento || null
        if (bairro !== undefined) dadosEmpresa.bairro = bairro || null
        if (cidade !== undefined) dadosEmpresa.cidade = cidade || null
        if (estado !== undefined) dadosEmpresa.estado = estado || null
      }

      if (Object.keys(dadosEmpresa).length === 0) {
        return res.status(400).json({
          error: "Nenhuma informação para atualizar"
        })
      }

      const empresaAtualizada = await prisma.empresa.update({
        where: {
          id: req.empresaId
        },
        data: dadosEmpresa,
        select: {
          id: true,
          nome: true,
          email: true,
          cpfCnpj: true,
          celular: true,
          cep: true,
          rua: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          estado: true,
          createdAt: true
        }
      })

      return res.json({
        tipo: "empresa",
        ...empresaAtualizada,
        empresa: empresaAtualizada
      })
    }

    // LOGIN COMO USUÁRIO
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: req.usuarioId,
        empresaId: req.empresaId
      }
    })

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado"
      })
    }

    const dadosUsuario = {}

    if (nome) {
      if (!senhaAtual) {
        return res.status(400).json({
          error: "Informe sua senha atual para alterar o nome"
        })
      }

      const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha)

      if (!senhaCorreta) {
        return res.status(400).json({
          error: "Senha atual incorreta"
        })
      }

      dadosUsuario.nome = nome
    }

    if (novaSenha) {
      if (!senhaAtual) {
        return res.status(400).json({
          error: "Informe a senha atual para alterar a senha"
        })
      }

      const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha)

      if (!senhaCorreta) {
        return res.status(400).json({
          error: "Senha atual incorreta"
        })
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({
          error: "A nova senha deve ter pelo menos 6 caracteres"
        })
      }

      dadosUsuario.senha = await bcrypt.hash(novaSenha, 10)
    }

    if (Object.keys(dadosUsuario).length > 0) {
      await prisma.usuario.update({
        where: {
          id: req.usuarioId
        },
        data: dadosUsuario
      })
    }

    let empresaAtualizada = null

    if (deveAtualizarEmpresa) {
      if (usuario.role !== "admin") {
        return res.status(403).json({
          error: "Apenas administradores podem alterar dados da empresa"
        })
      }

      const dadosEmpresa = {}

      if (empresaNome !== undefined) dadosEmpresa.nome = empresaNome || null
      if (cpfCnpj !== undefined) dadosEmpresa.cpfCnpj = cpfCnpj || null
      if (celular !== undefined) dadosEmpresa.celular = celular || null
      if (cep !== undefined) dadosEmpresa.cep = cep || null
      if (rua !== undefined) dadosEmpresa.rua = rua || null
      if (numero !== undefined) dadosEmpresa.numero = numero || null
      if (complemento !== undefined) dadosEmpresa.complemento = complemento || null
      if (bairro !== undefined) dadosEmpresa.bairro = bairro || null
      if (cidade !== undefined) dadosEmpresa.cidade = cidade || null
      if (estado !== undefined) dadosEmpresa.estado = estado || null

      empresaAtualizada = await prisma.empresa.update({
        where: {
          id: req.empresaId
        },
        data: dadosEmpresa,
        select: {
          id: true,
          nome: true,
          email: true,
          cpfCnpj: true,
          celular: true,
          cep: true,
          rua: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          estado: true,
          createdAt: true
        }
      })
    }

    if (Object.keys(dadosUsuario).length === 0 && !deveAtualizarEmpresa) {
      return res.status(400).json({
        error: "Nenhuma informação para atualizar"
      })
    }

    const usuarioAtualizado = await prisma.usuario.findFirst({
      where: {
        id: req.usuarioId,
        empresaId: req.empresaId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    const empresa = empresaAtualizada || await prisma.empresa.findUnique({
      where: {
        id: req.empresaId
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpfCnpj: true,
        celular: true,
        cep: true,
        rua: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        createdAt: true
      }
    })

    res.json({
      tipo: "usuario",
      ...usuarioAtualizado,
      empresa
    })
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)

    res.status(500).json({
      error: "Erro ao atualizar perfil"
    })
  }
}

