-- AlterTable
ALTER TABLE "Empresa"
ADD COLUMN IF NOT EXISTS "plano" TEXT NOT NULL DEFAULT 'start',
ADD COLUMN IF NOT EXISTS "statusAssinatura" TEXT NOT NULL DEFAULT 'ativa',
ADD COLUMN IF NOT EXISTS "limiteFuncionarios" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS "dataVencimentoPlano" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlataformaUsuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlataformaUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlataformaUsuario_email_key" ON "PlataformaUsuario"("email");
