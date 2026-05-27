import prisma from "../config/prisma.js"
import { decryptText } from "../utils/crypto.js"

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0"

export const normalizarTelefoneWhatsApp = (telefone) => {
  const digitos = String(telefone || "").replace(/\D/g, "")

  if (!digitos) return ""
  if (digitos.startsWith("55")) return digitos
  if (digitos.length >= 10 && digitos.length <= 11) return `55${digitos}`

  return digitos
}

const formatarDataBR = (data) => {
  if (!data) return "-"
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

const formatarHoraBR = (data) => {
  if (!data) return "-"
  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

export const montarParametrosAgendamento = (agendamento) => [
  agendamento.cliente?.nome || "cliente",
  agendamento.servico?.nome || agendamento.titulo || "Agendamento",
  agendamento.profissional?.nome || "-",
  formatarDataBR(agendamento.dataHora),
  formatarHoraBR(agendamento.dataHora)
]

export const enviarTemplateWhatsApp = async ({
  config,
  destino,
  templateName,
  idioma = "pt_BR",
  parameters = []
}) => {
  const token = decryptText(config.accessTokenEncrypted)
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: destino,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: idioma
        },
        components: [
          {
            type: "body",
            parameters: parameters.map((text) => ({
              type: "text",
              text: String(text ?? "-")
            }))
          }
        ]
      }
    })
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(JSON.stringify(data))
  }

  return data
}

export const enviarMensagemAgendamento = async ({
  empresaId,
  agendamento,
  tipo
}) => {
  const config = await prisma.empresaWhatsApp.findUnique({
    where: { empresaId }
  })

  if (!config?.ativo) {
    return null
  }

  if (!agendamento?.cliente?.telefone || agendamento.cliente.whatsappOptIn === false) {
    return null
  }

  const destino = normalizarTelefoneWhatsApp(agendamento.cliente.telefone)

  if (!destino) return null

  const templateName =
    tipo === "lembrete_24h"
      ? config.templateLembrete24h
      : config.templateConfirmacao

  const existente = await prisma.mensagemWhatsApp.findFirst({
    where: {
      empresaId,
      agendamentoId: agendamento.id,
      tipo,
      status: {
        in: ["pendente", "enviado"]
      }
    }
  })

  if (existente) return existente

  const mensagem = await prisma.mensagemWhatsApp.create({
    data: {
      empresaId,
      agendamentoId: agendamento.id,
      clienteId: agendamento.clienteId,
      tipo,
      destino,
      templateName,
      status: "pendente",
      payload: {
        parameters: montarParametrosAgendamento(agendamento)
      }
    }
  })

  try {
    const resposta = await enviarTemplateWhatsApp({
      config,
      destino,
      templateName,
      idioma: config.idioma,
      parameters: montarParametrosAgendamento(agendamento)
    })

    const providerMessageId = resposta?.messages?.[0]?.id || null

    return await prisma.mensagemWhatsApp.update({
      where: { id: mensagem.id },
      data: {
        status: "enviado",
        providerMessageId,
        enviadoEm: new Date(),
        erro: null
      }
    })
  } catch (error) {
    await prisma.empresaWhatsApp.update({
      where: { empresaId },
      data: {
        ultimoErro: error.message
      }
    }).catch(() => null)

    return await prisma.mensagemWhatsApp.update({
      where: { id: mensagem.id },
      data: {
        status: "erro",
        erro: error.message
      }
    })
  }
}
