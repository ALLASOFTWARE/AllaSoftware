import bcrypt from "bcryptjs"
import prisma from "../config/prisma.js"
import { gerarPlataformaAccessToken } from "../utils/jwt.js"
import { enviarEmailRegistro } from "../services/emailService.js"
import { LIMITE_MENSAGENS_WHATSAPP_GRATIS } from "../services/whatsappService.js"

const planoPadrao = {
  start: 2,
  plus: 5,
  pro: 10,
  business: 999
}

const normalizarLimiteFuncionarios = (plano, limiteFuncionarios) => {
  if (limiteFuncionarios !== undefined && limiteFuncionarios !== null && limiteFuncionarios !== "") {
    return Number(limiteFuncionarios)
  }

  return planoPadrao[plano] || planoPadrao.start
}

const selecionarEmpresaPainel = {
  id: true,
  nome: true,
  email: true,
  plano: true,
  statusAssinatura: true,
  limiteFuncionarios: true,
  dataVencimentoPlano: true,
  createdAt: true,
  usuarios: {
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  whatsappConfig: {
    select: {
      ativo: true,
      limiteMensagensGratis: true,
      permitirExcedente: true,
      ultimoErro: true,
      updatedAt: true
    }
  },
  _count: {
    select: {
      usuarios: true
    }
  }
}

const formatarEmpresaPainel = (empresa, usoWhatsApp = null) => {
  const usuariosAtivos = empresa.usuarios.filter((usuario) => usuario.status === "ativo")
  const admin = empresa.usuarios.find((usuario) => usuario.role === "admin")
  const limiteWhatsApp =
    empresa.whatsappConfig?.limiteMensagensGratis || LIMITE_MENSAGENS_WHATSAPP_GRATIS
  const mensagensWhatsApp = usoWhatsApp?.enviadas || 0
  const bloqueadasLimite = usoWhatsApp?.bloqueadasLimite || 0
  const excedentesWhatsApp = Math.max(mensagensWhatsApp - limiteWhatsApp, 0)
  const percentualWhatsApp =
    limiteWhatsApp > 0
      ? Math.min(Math.round((mensagensWhatsApp / limiteWhatsApp) * 100), 100)
      : 100

  return {
    id: empresa.id,
    nome: empresa.nome,
    email: empresa.email,
    plano: empresa.plano,
    statusAssinatura: empresa.statusAssinatura,
    limiteFuncionarios: empresa.limiteFuncionarios,
    dataVencimentoPlano: empresa.dataVencimentoPlano,
    createdAt: empresa.createdAt,
    totalUsuarios: empresa._count.usuarios,
    usuariosAtivos: usuariosAtivos.length,
    uso: {
      funcionarios: {
        ativos: usuariosAtivos.length,
        limite: empresa.limiteFuncionarios,
        percentual:
          empresa.limiteFuncionarios > 0
            ? Math.min(Math.round((usuariosAtivos.length / empresa.limiteFuncionarios) * 100), 100)
            : 100,
        excedentes: Math.max(usuariosAtivos.length - empresa.limiteFuncionarios, 0)
      },
      whatsapp: {
        ativo: Boolean(empresa.whatsappConfig?.ativo),
        limite: limiteWhatsApp,
        enviadas: mensagensWhatsApp,
        restantes: Math.max(limiteWhatsApp - mensagensWhatsApp, 0),
        excedentes: excedentesWhatsApp,
        bloqueadasLimite,
        percentual: percentualWhatsApp,
        permitirExcedente: Boolean(empresa.whatsappConfig?.permitirExcedente),
        limiteAtingido: mensagensWhatsApp >= limiteWhatsApp,
        bloqueado: mensagensWhatsApp >= limiteWhatsApp && !empresa.whatsappConfig?.permitirExcedente,
        ultimoErro: empresa.whatsappConfig?.ultimoErro || null
      }
    },
    admin: admin
      ? {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          status: admin.status
        }
      : null
  }
}

export const loginPlataforma = async (req, res) => {
  try {
    const { email, senha } = req.body || {}

    if (!email || !senha) {
      return res.status(400).json({ error: "Informe email e senha" })
    }

    const usuario = await prisma.plataformaUsuario.findUnique({
      where: { email }
    })

    if (!usuario || usuario.status !== "ativo") {
      return res.status(401).json({ error: "Credenciais inválidas" })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha)

    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" })
    }

    const accessToken = gerarPlataformaAccessToken(usuario.id, usuario.role)

    res.json({
      accessToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        tipo: "plataforma"
      }
    })
  } catch (error) {
    console.error("Erro no login da plataforma:", error)
    res.status(500).json({ error: "Erro ao fazer login da plataforma" })
  }
}

export const perfilPlataforma = async (req, res) => {
  try {
    const usuario = await prisma.plataformaUsuario.findUnique({
      where: { id: req.plataformaUsuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        status: true
      }
    })

    if (!usuario) {
      return res.status(404).json({ error: "Usuário da plataforma não encontrado" })
    }

    res.json({ ...usuario, tipo: "plataforma" })
  } catch (error) {
    console.error("Erro ao carregar perfil da plataforma:", error)
    res.status(500).json({ error: "Erro ao carregar perfil da plataforma" })
  }
}

export const listarEmpresasPlataforma = async (req, res) => {
  try {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const fimMes = new Date(inicioMes)
    fimMes.setMonth(fimMes.getMonth() + 1)

    const [empresas, usoMensagens] = await Promise.all([
      prisma.empresa.findMany({
      select: selecionarEmpresaPainel,
      orderBy: {
        createdAt: "desc"
      }
      }),
      prisma.mensagemWhatsApp.groupBy({
        by: ["empresaId", "status"],
        where: {
          OR: [
            {
              status: "enviado",
              enviadoEm: {
                gte: inicioMes,
                lt: fimMes
              }
            },
            {
              status: "bloqueado_limite",
              createdAt: {
                gte: inicioMes,
                lt: fimMes
              }
            }
          ]
        },
        _count: {
          _all: true
        }
      })
    ])

    const usoPorEmpresa = new Map()

    usoMensagens.forEach((item) => {
      const atual = usoPorEmpresa.get(item.empresaId) || {
        enviadas: 0,
        bloqueadasLimite: 0
      }

      if (item.status === "enviado") {
        atual.enviadas += item._count._all
      }

      if (item.status === "bloqueado_limite") {
        atual.bloqueadasLimite += item._count._all
      }

      usoPorEmpresa.set(item.empresaId, atual)
    })

    res.json(empresas.map((empresa) => formatarEmpresaPainel(empresa, usoPorEmpresa.get(empresa.id))))
  } catch (error) {
    console.error("Erro ao listar empresas da plataforma:", error)
    res.status(500).json({ error: "Erro ao listar empresas" })
  }
}

export const criarEmpresaPlataforma = async (req, res) => {
  try {
    const {
      nomeEmpresa,
      nomeAdmin,
      email,
      senha,
      plano = "start",
      statusAssinatura = "ativa",
      limiteFuncionarios,
      dataVencimentoPlano
    } = req.body || {}

    if (!nomeEmpresa || !nomeAdmin || !email || !senha) {
      return res.status(400).json({
        error: "Os campos nomeEmpresa, nomeAdmin, email e senha são obrigatórios"
      })
    }

    const [empresaExistente, usuarioExistente] = await Promise.all([
      prisma.empresa.findUnique({ where: { email } }),
      prisma.usuario.findUnique({ where: { email } })
    ])

    if (empresaExistente || usuarioExistente) {
      return res.status(400).json({
        error: "Já existe empresa ou usuário cadastrado com esse email"
      })
    }

    const limiteFinal = normalizarLimiteFuncionarios(plano, limiteFuncionarios)

    if (!Number.isInteger(limiteFinal) || limiteFinal <= 0) {
      return res.status(400).json({
        error: "O limite de funcionários precisa ser um número inteiro maior que zero"
      })
    }

    const hash = await bcrypt.hash(senha, 10)

    const empresa = await prisma.$transaction(async (tx) => {
      const novaEmpresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa,
          email,
          senha: hash,
          plano,
          statusAssinatura,
          limiteFuncionarios: limiteFinal,
          dataVencimentoPlano: dataVencimentoPlano ? new Date(dataVencimentoPlano) : null
        }
      })

      await tx.usuario.create({
        data: {
          nome: nomeAdmin,
          email,
          senha: hash,
          role: "admin",
          cargo: "Administrador",
          status: "ativo",
          tipoEquipe: "admin",
          profissional: true,
          preSelecionarAgendamento: true,
          empresaId: novaEmpresa.id
        }
      })

      return tx.empresa.findUnique({
        where: { id: novaEmpresa.id },
        select: selecionarEmpresaPainel
      })
    })

    enviarEmailRegistro(email, nomeEmpresa, nomeAdmin).catch((error) => {
      console.error("Erro ao enviar email de boas-vindas:", error)
    })

    res.status(201).json(formatarEmpresaPainel(empresa))
  } catch (error) {
    console.error("Erro ao criar empresa pela plataforma:", error)
    res.status(500).json({ error: "Erro ao criar empresa" })
  }
}

export const atualizarEmpresaPlataforma = async (req, res) => {
  try {
    const { id } = req.params
    const {
      nome,
      plano,
      statusAssinatura,
      limiteFuncionarios,
      dataVencimentoPlano
    } = req.body || {}

    const empresaAtual = await prisma.empresa.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        plano: true
      }
    })

    if (!empresaAtual) {
      return res.status(404).json({ error: "Empresa não encontrada" })
    }

    const dados = {}

    if (nome !== undefined) dados.nome = nome
    if (plano !== undefined) dados.plano = plano
    if (statusAssinatura !== undefined) dados.statusAssinatura = statusAssinatura
    if (dataVencimentoPlano !== undefined) {
      dados.dataVencimentoPlano = dataVencimentoPlano ? new Date(dataVencimentoPlano) : null
    }
    if (limiteFuncionarios !== undefined) {
      const limite = normalizarLimiteFuncionarios(plano || empresaAtual.plano, limiteFuncionarios)
      if (!Number.isInteger(limite) || limite <= 0) {
        return res.status(400).json({
          error: "O limite de funcionários precisa ser um número inteiro maior que zero"
        })
      }
      dados.limiteFuncionarios = limite
    }

    const empresa = await prisma.empresa.update({
      where: { id: Number(id) },
      data: dados,
      select: selecionarEmpresaPainel
    })

    res.json(formatarEmpresaPainel(empresa))
  } catch (error) {
    console.error("Erro ao atualizar empresa pela plataforma:", error)
    res.status(500).json({ error: "Erro ao atualizar empresa" })
  }
}

export const resetarSenhaAdminEmpresa = async (req, res) => {
  try {
    const { id } = req.params
    const { senha } = req.body || {}

    if (!senha || senha.length < 6) {
      return res.status(400).json({ error: "Informe uma senha com pelo menos 6 caracteres" })
    }

    const admin = await prisma.usuario.findFirst({
      where: {
        empresaId: Number(id),
        role: "admin"
      }
    })

    if (!admin) {
      return res.status(404).json({ error: "Admin da empresa não encontrado" })
    }

    const hash = await bcrypt.hash(senha, 10)

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: admin.id },
        data: { senha: hash }
      }),
      prisma.empresa.update({
        where: { id: Number(id) },
        data: { senha: hash }
      })
    ])

    res.json({ message: "Senha do admin atualizada com sucesso" })
  } catch (error) {
    console.error("Erro ao resetar senha do admin:", error)
    res.status(500).json({ error: "Erro ao resetar senha do admin" })
  }
}
