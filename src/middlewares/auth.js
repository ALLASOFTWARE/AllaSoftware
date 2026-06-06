import jwt from "jsonwebtoken"
import prisma from "../config/prisma.js"

export const auth = async (req, res, next) => {
  let token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ error: "Token nao enviado" })
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7)
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.empresaId = decoded.empresaId
    req.usuarioId = decoded.usuarioId || null
    req.role = decoded.role || null

    const empresa = await prisma.empresa.findUnique({
      where: { id: req.empresaId },
      select: {
        statusAssinatura: true
      }
    })

    if (!empresa) {
      return res.status(401).json({ error: "Empresa nao encontrada" })
    }

    if (!["ativa", "teste"].includes(empresa.statusAssinatura)) {
      return res.status(403).json({
        error: "A assinatura desta empresa nao esta ativa. Entre em contato com a AllaSoftware."
      })
    }

    if (req.usuarioId) {
      const usuario = await prisma.usuario.findFirst({
        where: {
          id: req.usuarioId,
          empresaId: req.empresaId
        },
        select: {
          role: true,
          status: true
        }
      })

      if (!usuario || usuario.status !== "ativo") {
        return res.status(403).json({
          error: "Usuario inativo ou sem acesso"
        })
      }

      req.role = usuario.role
    }

    next()
  } catch (err) {
    return res.status(401).json({ error: "Token invalido" })
  }
}
