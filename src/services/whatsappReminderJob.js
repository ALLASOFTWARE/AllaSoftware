import prisma from "../config/prisma.js"
import { enviarMensagemAgendamento } from "./whatsappService.js"

const INTERVALO_MS = Number(process.env.WHATSAPP_REMINDER_INTERVAL_MS || 5 * 60 * 1000)
let iniciado = false

export const processarLembretesWhatsApp = async () => {
  const agora = new Date()
  const inicio = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
  const fim = new Date(inicio.getTime() + INTERVALO_MS)

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      status: "agendado",
      dataHora: {
        gte: inicio,
        lt: fim
      },
      clienteId: {
        not: null
      },
      mensagensWhatsApp: {
        none: {
          tipo: "lembrete_24h",
          status: {
            in: ["pendente", "enviado"]
          }
        }
      }
    },
    include: {
      cliente: true,
      servico: true,
      profissional: true
    },
    take: 100
  })

  for (const agendamento of agendamentos) {
    await enviarMensagemAgendamento({
      empresaId: agendamento.empresaId,
      agendamento,
      tipo: "lembrete_24h"
    }).catch((error) => {
      console.error("Erro ao enviar lembrete WhatsApp:", error)
    })
  }
}

export const iniciarLembretesWhatsApp = () => {
  if (iniciado || process.env.WHATSAPP_REMINDERS_ENABLED === "false") return

  iniciado = true
  setInterval(() => {
    processarLembretesWhatsApp().catch((error) => {
      console.error("Erro no job de lembretes WhatsApp:", error)
    })
  }, INTERVALO_MS)
}
