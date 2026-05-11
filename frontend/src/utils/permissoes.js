export const getUsuarioLogado = () => {
  try {
    return JSON.parse(localStorage.getItem("usuario"))
  } catch {
    return null
  }
}

export const podeAcessar = (modulo, acao = "visualizar") => {
  const usuario = getUsuarioLogado()

  if (!usuario) return false

  if (usuario.role === "admin") return true

  return usuario?.permissoes?.[modulo]?.[acao] === true
}