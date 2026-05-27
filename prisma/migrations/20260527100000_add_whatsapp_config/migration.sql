-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EmpresaWhatsApp" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "numero" TEXT,
    "nomeExibicao" TEXT,
    "businessId" TEXT,
    "wabaId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "templateConfirmacao" TEXT NOT NULL DEFAULT 'agendamento_confirmado',
    "templateLembrete24h" TEXT NOT NULL DEFAULT 'lembrete_agendamento_24h',
    "idioma" TEXT NOT NULL DEFAULT 'pt_BR',
    "status" TEXT NOT NULL DEFAULT 'manual',
    "ultimoErro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemWhatsApp" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "agendamentoId" INTEGER,
    "clienteId" INTEGER,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'whatsapp',
    "destino" TEXT NOT NULL,
    "templateName" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "providerMessageId" TEXT,
    "erro" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "enviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensagemWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaWhatsApp_empresaId_key" ON "EmpresaWhatsApp"("empresaId");
CREATE INDEX "EmpresaWhatsApp_empresaId_idx" ON "EmpresaWhatsApp"("empresaId");
CREATE INDEX "MensagemWhatsApp_empresaId_idx" ON "MensagemWhatsApp"("empresaId");
CREATE INDEX "MensagemWhatsApp_agendamentoId_idx" ON "MensagemWhatsApp"("agendamentoId");
CREATE INDEX "MensagemWhatsApp_clienteId_idx" ON "MensagemWhatsApp"("clienteId");
CREATE INDEX "MensagemWhatsApp_status_idx" ON "MensagemWhatsApp"("status");
CREATE INDEX "MensagemWhatsApp_scheduledFor_idx" ON "MensagemWhatsApp"("scheduledFor");

-- AddForeignKey
ALTER TABLE "EmpresaWhatsApp" ADD CONSTRAINT "EmpresaWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
