-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER,
    "empresaId" INTEGER NOT NULL,
    "tipoPreco" TEXT NOT NULL DEFAULT 'varejo',
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBruto" DOUBLE PRECISION NOT NULL,
    "totalFinal" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'fechada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "tipoItem" TEXT NOT NULL,
    "referenciaId" INTEGER NOT NULL,
    "nomeItem" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
