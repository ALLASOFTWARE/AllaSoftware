-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoVarejo" DOUBLE PRECISION NOT NULL,
    "precoAtacado" DOUBLE PRECISION,
    "estoque" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "empresaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);
