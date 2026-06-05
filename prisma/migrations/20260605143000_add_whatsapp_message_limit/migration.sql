ALTER TABLE "EmpresaWhatsApp"
ADD COLUMN "limiteMensagensGratis" INTEGER NOT NULL DEFAULT 350,
ADD COLUMN "permitirExcedente" BOOLEAN NOT NULL DEFAULT false;
