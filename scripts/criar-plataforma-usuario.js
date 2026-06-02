import "dotenv/config"
import bcrypt from "bcryptjs"
import prisma from "../src/config/prisma.js"

const nome = process.env.PLATAFORMA_ADMIN_NOME || "AllaSoftware"
const email = process.env.PLATAFORMA_ADMIN_EMAIL
const senha = process.env.PLATAFORMA_ADMIN_PASSWORD

if (!email || !senha) {
  console.error("Defina PLATAFORMA_ADMIN_EMAIL e PLATAFORMA_ADMIN_PASSWORD no ambiente.")
  process.exit(1)
}

if (senha.length < 8) {
  console.error("Use uma senha com pelo menos 8 caracteres.")
  process.exit(1)
}

const existente = await prisma.plataformaUsuario.findUnique({
  where: { email }
})

if (existente) {
  console.log(`Usuário da plataforma já existe: ${email}`)
  await prisma.$disconnect()
  process.exit(0)
}

const hash = await bcrypt.hash(senha, 10)

await prisma.plataformaUsuario.create({
  data: {
    nome,
    email,
    senha: hash,
    role: "owner",
    status: "ativo"
  }
})

console.log(`Usuário da plataforma criado: ${email}`)
await prisma.$disconnect()
