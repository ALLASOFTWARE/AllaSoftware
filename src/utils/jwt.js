import jwt from "jsonwebtoken"

// Gerar Access Token (sem expiração)
export const gerarAccessToken = (empresaId, usuarioId, role) => {
  return jwt.sign(
    { empresaId, usuarioId, role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  )
}

export const gerarPlataformaAccessToken = (plataformaUsuarioId, role) => {
  return jwt.sign(
    { plataformaUsuarioId, role, tipo: "plataforma" },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  )
}

// Gerar Refresh Token (expires em 7 dias)
export const gerarRefreshToken = (empresaId, usuarioId) => {
  return jwt.sign(
    { empresaId, usuarioId, tipo: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  )
}

// Verificar e decodificar Access Token
export const verificarAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Verificar e decodificar Refresh Token
export const verificarRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    if (decoded.tipo !== "refresh") return null
    return decoded
  } catch (error) {
    return null
  }
}
