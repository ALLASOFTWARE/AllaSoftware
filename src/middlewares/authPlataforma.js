import jwt from "jsonwebtoken"

export const authPlataforma = (req, res, next) => {
  let token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ error: "Token não enviado" })
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7)
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.tipo !== "plataforma" || !decoded.plataformaUsuarioId) {
      return res.status(403).json({ error: "Acesso restrito ao painel da plataforma" })
    }

    req.plataformaUsuarioId = decoded.plataformaUsuarioId
    req.role = decoded.role || null

    next()
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" })
  }
}
