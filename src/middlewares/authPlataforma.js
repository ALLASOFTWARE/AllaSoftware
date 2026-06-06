import jwt from "jsonwebtoken"
import prisma from "../config/prisma.js"

export const authPlataforma = async (req, res, next) => {
  let token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ error: "Token nao enviado" })
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7)
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.tipo !== "plataforma" || !decoded.plataformaUsuarioId) {
      return res.status(403).json({ error: "Acesso restrito ao painel da plataforma" })
    }

    const usuario = await prisma.plataformaUsuario.findUnique({
      where: { id: decoded.plataformaUsuarioId },
      select: {
        role: true,
        status: true
      }
    })

    if (!usuario || usuario.status !== "ativo") {
      return res.status(403).json({ error: "Usuario da plataforma inativo ou sem acesso" })
    }

    req.plataformaUsuarioId = decoded.plataformaUsuarioId
    req.role = usuario.role

    next()
  } catch (err) {
    return res.status(401).json({ error: "Token invalido" })
  }
}
