import prisma from "../config/prisma.js"
import bcrypt from "bcryptjs"
import { gerarAccessToken, gerarRefreshToken } from "../utils/jwt.js"
import { enviarEmailRegistro } from "../services/emailService.js"
import { registrarAuditoria, ACOES_AUDITORIA, ENTIDADES_AUDITORIA } from "../services/auditoria.js"

export const register = async (req, res) => {
  try {
    if (process.env.ALLOW_PUBLIC_COMPANY_REGISTER !== "true") {
      return res.status(403).json({
        error: "Cadastro público de empresas desativado. Entre em contato com a AllaSoftware."
      })
    }

    const { nomeEmpresa, nomeUsuario, email, senha } = req.body || {}

    if (!nomeEmpresa || !nomeUsuario || !email || !senha) {
      return res.status(400).json({
        error: "Os campos nomeEmpresa, nomeUsuario, email e senha são obrigatórios"
      })
    }

    const empresaExistente = await prisma.empresa.findUnique({
      where: { email }
    })

    if (empresaExistente) {
      return res.status(400).json({
        error: "Já existe uma empresa cadastrada com esse email"
      })
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    })

    if (usuarioExistente) {
      return res.status(400).json({
        error: "Já existe um usuário cadastrado com esse email"
      })
    }

    const hash = await bcrypt.hash(senha, 10)

    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        email,
        senha: hash
      }
    })

    const usuarioAdmin = await prisma.usuario.create({
      data: {
        nome: nomeUsuario,
        email,
        senha: hash,
        role: "admin",
        cargo: "Administrador",
        status: "ativo",
        tipoEquipe: "admin",
        profissional: true,
        preSelecionarAgendamento: true,
        empresaId: empresa.id
      }
    })

    // Enviar email de boas-vindas
    await enviarEmailRegistro(email, nomeEmpresa, nomeUsuario)

    //  Registrar auditoria
    await registrarAuditoria(
      empresa.id,
      usuarioAdmin.id,
      ACOES_AUDITORIA.CREATE,
      ENTIDADES_AUDITORIA.EMPRESA,
      `Empresa ${nomeEmpresa} registrada`,
      { empresaNome: nomeEmpresa, email }
    )

    const empresaVerificacaoRemovida = await prisma.empresa.findUnique({
      where: { id: empresa.id },
      select: {
        statusAssinatura: true
      }
    })

    if (!empresaVerificacaoRemovida || !["ativa", "teste"].includes(empresaVerificacaoRemovida.statusAssinatura)) {
      return res.status(403).json({
        error: "A assinatura desta empresa não está ativa. Entre em contato com a AllaSoftware."
      })
    }

    // Gerar tokens
    const accessToken = gerarAccessToken(empresa.id, usuarioAdmin.id, usuarioAdmin.role)
    const refreshToken = gerarRefreshToken(empresa.id, usuarioAdmin.id)

    res.status(201).json({
      message: "Empresa e usuário admin criados com sucesso",
      accessToken,
      refreshToken,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        email: empresa.email
      },
      usuario: {
        id: usuarioAdmin.id,
        nome: usuarioAdmin.nome,
        email: usuarioAdmin.email,
        role: usuarioAdmin.role,
        cargo: usuarioAdmin.cargo,
        status: usuarioAdmin.status,
        permissoes: usuarioAdmin.permissoes,
        tipoEquipe: usuarioAdmin.tipoEquipe,
        profissional: usuarioAdmin.profissional,
        preSelecionarAgendamento: usuarioAdmin.preSelecionarAgendamento,
        empresaId: usuarioAdmin.empresaId
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao cadastrar empresa"
    })
  }
}

export const login = async (req, res) => {
  try {
    const { email, senha } = req.body

    const empresa = await prisma.empresa.findUnique({
      where: { email }
    })

    if (!empresa) {
      return res.status(404).json({
        error: "Credenciais inválidas"
      })
    }

    const senhaValida = await bcrypt.compare(senha, empresa.senha)

    if (!senhaValida) {
      await registrarAuditoria(empresa.id, null, ACOES_AUDITORIA.PERMISSAO_NEGADA, ENTIDADES_AUDITORIA.EMPRESA, "Tentativa de login com senha inválida")
      return res.status(401).json({
        error: "Credenciais inválidas"
      })
    }

    // Criar tokens com info básica da empresa
    const accessToken = gerarAccessToken(empresa.id, null, "admin")
    const refreshToken = gerarRefreshToken(empresa.id, null)

    await registrarAuditoria(empresa.id, null, ACOES_AUDITORIA.LOGIN, ENTIDADES_AUDITORIA.EMPRESA, `Login da empresa`)

    res.json({ 
      accessToken,
      refreshToken,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        email: empresa.email
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao fazer login"
    })
  }
}

export const loginUsuario = async (req, res) => {
  try {
    const { email, senha } = req.body || {}

    const usuario = await prisma.usuario.findUnique({
      where: {
        email
      }
    })

    if (!usuario) {
      return res.status(404).json({
        error: "Credenciais inválidas"
      })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha)

    if (!senhaValida) {
      await registrarAuditoria(usuario.empresaId, usuario.id, ACOES_AUDITORIA.PERMISSAO_NEGADA, ENTIDADES_AUDITORIA.USUARIO, "Tentativa de login com senha inválida")
      return res.status(401).json({
        error: "Credenciais inválidas"
      })
    }

    if (usuario.status !== "ativo") {
      return res.status(403).json({
        error: "Usuário desativado. Entre em contato com o administrador."
      })
    }

    // Gerar tokens
    const empresaUsuario = await prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: {
        statusAssinatura: true
      }
    })

    if (!empresaUsuario || !["ativa", "teste"].includes(empresaUsuario.statusAssinatura)) {
      return res.status(403).json({
        error: "A assinatura desta empresa não está ativa. Entre em contato com a AllaSoftware."
      })
    }

    const accessToken = gerarAccessToken(usuario.empresaId, usuario.id, usuario.role)
    const refreshToken = gerarRefreshToken(usuario.empresaId, usuario.id)

    await registrarAuditoria(usuario.empresaId, usuario.id, ACOES_AUDITORIA.LOGIN, ENTIDADES_AUDITORIA.USUARIO, `${usuario.nome} fez login`)

    res.json({
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        cargo: usuario.cargo,
        status: usuario.status,
        permissoes: usuario.permissoes,
        tipoEquipe: usuario.tipoEquipe,
        profissional: usuario.profissional,
        preSelecionarAgendamento: usuario.preSelecionarAgendamento,
        empresaId: usuario.empresaId
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao fazer login do usuário"
    })
  }
}

// Renovar token usando refresh token
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token não fornecido"
      })
    }

    // Verificar refresh token
    const { verificarRefreshToken } = await import("../utils/jwt.js")
    const decoded = verificarRefreshToken(refreshToken)

    if (!decoded) {
      return res.status(401).json({
        error: "Refresh token inválido ou expirado"
      })
    }

    // Obter info do usuário
    let role = "funcionario"
    if (decoded.usuarioId) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.usuarioId }
      })
      role = usuario?.role || "funcionario"
    }

    // Gerar novo access token
    const novoAccessToken = gerarAccessToken(decoded.empresaId, decoded.usuarioId, role)

    res.json({
      accessToken: novoAccessToken
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: "Erro ao renovar token"
    })
  }
}
