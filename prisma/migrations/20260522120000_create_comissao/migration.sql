-- CreateTable
CREATE TABLE "Comissao" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "vendaId" INTEGER,
    "agendamentoId" INTEGER,
    "transacaoId" INTEGER,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valorBase" DOUBLE PRECISION NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valorComissao" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comissao_empresaId_idx" ON "Comissao"("empresaId");

-- CreateIndex
CREATE INDEX "Comissao_usuarioId_idx" ON "Comissao"("usuarioId");

-- CreateIndex
CREATE INDEX "Comissao_vendaId_idx" ON "Comissao"("vendaId");

-- CreateIndex
CREATE INDEX "Comissao_agendamentoId_idx" ON "Comissao"("agendamentoId");

-- CreateIndex
CREATE INDEX "Comissao_status_idx" ON "Comissao"("status");

-- CreateIndex
CREATE INDEX "Comissao_createdAt_idx" ON "Comissao"("createdAt");

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: congela comissões antigas usando os percentuais existentes no momento da migration.
INSERT INTO "Comissao" (
    "empresaId",
    "usuarioId",
    "vendaId",
    "agendamentoId",
    "tipo",
    "descricao",
    "valorBase",
    "percentual",
    "valorComissao",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    a."empresaId",
    a."profissionalId",
    a."vendaId",
    a."id",
    'servico',
    COALESCE(s."nome", a."titulo", 'Serviço'),
    COALESCE(a."valorServico", s."preco", 0),
    COALESCE(s."comissaoPercentual", u."comissaoPercentualPadrao", 0),
    (COALESCE(a."valorServico", s."preco", 0) * COALESCE(s."comissaoPercentual", u."comissaoPercentualPadrao", 0)) / 100,
    'pendente',
    COALESCE(a."concluidoEm", a."updatedAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "Agendamento" a
JOIN "Usuario" u ON u."id" = a."profissionalId"
LEFT JOIN "Servico" s ON s."id" = a."servicoId"
WHERE a."status" = 'concluido'
  AND a."profissionalId" IS NOT NULL;

INSERT INTO "Comissao" (
    "empresaId",
    "usuarioId",
    "vendaId",
    "agendamentoId",
    "tipo",
    "descricao",
    "valorBase",
    "percentual",
    "valorComissao",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    v."empresaId",
    v."vendedorId",
    v."id",
    NULL,
    i."tipoItem",
    i."nomeItem",
    i."subtotal",
    COALESCE(p."comissaoPercentual", s."comissaoPercentual", u."comissaoPercentualPadrao", 0),
    (i."subtotal" * COALESCE(p."comissaoPercentual", s."comissaoPercentual", u."comissaoPercentualPadrao", 0)) / 100,
    'pendente',
    v."createdAt",
    CURRENT_TIMESTAMP
FROM "Venda" v
JOIN "Usuario" u ON u."id" = v."vendedorId"
JOIN "ItemVenda" i ON i."vendaId" = v."id"
LEFT JOIN "Produto" p ON i."tipoItem" = 'produto' AND p."id" = i."referenciaId"
LEFT JOIN "Servico" s ON i."tipoItem" = 'servico' AND s."id" = i."referenciaId"
LEFT JOIN "Agendamento" a ON a."vendaId" = v."id"
WHERE v."vendedorId" IS NOT NULL
  AND NOT (i."tipoItem" = 'servico' AND a."id" IS NOT NULL);
