import prisma from "../config/prisma.js"
import { encryptText } from "../utils/crypto.js"
import {
  enviarTemplateWhatsApp,
  normalizarTelefoneWhatsApp,
  obterUsoMensalWhatsApp,
  verificarLimiteEnvioWhatsApp,
  LIMITE_MENSAGENS_WHATSAPP_GRATIS
} from "../services/whatsappService.js"

const esconderToken = (config, usoMensal = null) => {
  if (!config) return null

  return {
    ...config,
    accessTokenEncrypted: undefined,
    tokenConfigurado: Boolean(config.accessTokenEncrypted),
    usoMensal
  }
}

export const obterConfiguracaoWhatsApp = async (req, res) => {
  try {
    const config = await prisma.empresaWhatsApp.findUnique({
      where: {
        empresaId: req.empresaId
      }
    })

    const usoMensal = config
      ? await obterUsoMensalWhatsApp(req.empresaId, config)
      : {
          limite: LIMITE_MENSAGENS_WHATSAPP_GRATIS,
          usadas: 0,
          restantes: LIMITE_MENSAGENS_WHATSAPP_GRATIS,
          excedentes: 0,
          percentual: 0,
          permitirExcedente: false,
          limiteAtingido: false,
          bloqueado: false
        }

    res.json(esconderToken(config, usoMensal))
  } catch (error) {
    console.error("Erro ao buscar configuracao WhatsApp:", error)
    res.status(500).json({
      error: "Erro ao buscar configuracao do WhatsApp"
    })
  }
}

export const salvarConfiguracaoWhatsApp = async (req, res) => {
  try {
    const {
      ativo = false,
      numero,
      nomeExibicao,
      businessId,
      wabaId,
      phoneNumberId,
      accessToken,
      templateConfirmacao,
      templateLembrete24h,
      permitirExcedente = false,
      idioma = "pt_BR"
    } = req.body || {}

    if (!phoneNumberId) {
      return res.status(400).json({
        error: "Informe o Phone Number ID"
      })
    }

    const existente = await prisma.empresaWhatsApp.findUnique({
      where: {
        empresaId: req.empresaId
      }
    })

    if (!existente && !accessToken) {
      return res.status(400).json({
        error: "Informe o Access Token"
      })
    }

    const dados = {
      ativo: Boolean(ativo),
      numero: numero || null,
      nomeExibicao: nomeExibicao || null,
      businessId: businessId || null,
      wabaId: wabaId || null,
      phoneNumberId,
      templateConfirmacao: templateConfirmacao || "agendamento_confirmado",
      templateLembrete24h: templateLembrete24h || "lembrete_agendamento_24h",
      limiteMensagensGratis: LIMITE_MENSAGENS_WHATSAPP_GRATIS,
      permitirExcedente: Boolean(permitirExcedente),
      idioma: idioma || "pt_BR",
      status: "manual"
    }

    if (accessToken) {
      dados.accessTokenEncrypted = encryptText(accessToken)
    }

    const config = await prisma.empresaWhatsApp.upsert({
      where: {
        empresaId: req.empresaId
      },
      create: {
        empresaId: req.empresaId,
        ...dados
      },
      update: dados
    })

    const usoMensal = await obterUsoMensalWhatsApp(req.empresaId, config)

    res.json(esconderToken(config, usoMensal))
  } catch (error) {
    console.error("Erro ao salvar configuracao WhatsApp:", error)
    res.status(500).json({
      error: "Erro ao salvar configuracao do WhatsApp"
    })
  }
}

export const testarConfiguracaoWhatsApp = async (req, res) => {
  try {
    const { telefone } = req.body || {}

    const config = await prisma.empresaWhatsApp.findUnique({
      where: {
        empresaId: req.empresaId
      }
    })

    if (!config) {
      return res.status(404).json({
        error: "Configure o WhatsApp antes de testar"
      })
    }

    const destino = normalizarTelefoneWhatsApp(telefone || config.numero)

    if (!destino) {
      return res.status(400).json({
        error: "Informe um telefone valido para teste"
      })
    }

    try {
      await verificarLimiteEnvioWhatsApp(req.empresaId, config)
    } catch (error) {
      if (error.code === "WHATSAPP_LIMIT_EXCEEDED") {
        return res.status(402).json({
          error: error.message,
          usoMensal: error.uso
        })
      }

      throw error
    }

    const mensagem = await prisma.mensagemWhatsApp.create({
      data: {
        empresaId: req.empresaId,
        tipo: "teste",
        destino,
        templateName: config.templateConfirmacao,
        status: "pendente",
        payload: {
          parameters: ["Teste", "Agendamento", "Profissional", "27/05/2026", "14:00"]
        }
      }
    })

    const resposta = await enviarTemplateWhatsApp({
      config,
      destino,
      templateName: config.templateConfirmacao,
      idioma: config.idioma,
      parameters: ["Teste", "Agendamento", "Profissional", "27/05/2026", "14:00"]
    })

    const providerMessageId = resposta?.messages?.[0]?.id || null

    await prisma.mensagemWhatsApp.update({
      where: { id: mensagem.id },
      data: {
        status: "enviado",
        providerMessageId,
        enviadoEm: new Date(),
        erro: null
      }
    })

    res.json({
      message: "Mensagem de teste enviada",
      providerMessageId
    })
  } catch (error) {
    console.error("Erro ao testar WhatsApp:", error)
    res.status(500).json({
      error: "Erro ao enviar mensagem de teste",
      detalhes: error.message
    })
  }
}

export const listarMensagensWhatsApp = async (req, res) => {
  try {
    const mensagens = await prisma.mensagemWhatsApp.findMany({
      where: {
        empresaId: req.empresaId
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true
          }
        },
        agendamento: {
          select: {
            id: true,
            titulo: true,
            dataHora: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    })

    res.json(mensagens)
  } catch (error) {
    console.error("Erro ao listar mensagens WhatsApp:", error)
    res.status(500).json({
      error: "Erro ao listar mensagens do WhatsApp"
    })
  }
}
