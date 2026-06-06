import prisma from "../config/prisma.js"

const aliasesModulos = {
  "contas-receber": "contasReceber",
  "contas-pagar": "contasPagar",
  equipe: "usuarios",
  comissoes: "usuarios"
}

const normalizarModulo = (modulo) => aliasesModulos[modulo] || modulo

const usuarioTemPermissao = (permissoes, modulo, acao) => {
  const chaveModulo = normalizarModulo(modulo)
  return permissoes?.[chaveModulo]?.[acao] === true
}

const buscarPermissoesUsuario = async (req) => {
  if (!req.usuarioId) return null

  return await prisma.usuario.findFirst({
    where: {
      id: req.usuarioId,
      empresaId: req.empresaId,
      status: "ativo"
    },
    select: {
      permissoes: true
    }
  })
}

export const permitirPermissao = (modulo, acao = "visualizar") => {
  return async (req, res, next) => {
    try {
      if (req.role === "admin") {
        return next()
      }

      if (!req.usuarioId) {
        return res.status(403).json({
          error: "Usuario sem permissao para esta acao"
        })
      }

      const usuario = await buscarPermissoesUsuario(req)

      if (!usuarioTemPermissao(usuario?.permissoes, modulo, acao)) {
        return res.status(403).json({
          error: "Voce nao tem permissao para executar esta acao"
        })
      }

      next()
    } catch (error) {
      console.error("Erro ao validar permissao:", error)
      res.status(500).json({
        error: "Erro ao validar permissao"
      })
    }
  }
}

export const permitirQualquerPermissao = (...regras) => {
  return async (req, res, next) => {
    try {
      if (req.role === "admin") {
        return next()
      }

      if (!req.usuarioId) {
        return res.status(403).json({
          error: "Usuario sem permissao para esta acao"
        })
      }

      const usuario = await buscarPermissoesUsuario(req)
      const permitido = regras.some((regra) => {
        if (typeof regra === "string") {
          return usuarioTemPermissao(usuario?.permissoes, regra, "visualizar")
        }

        return usuarioTemPermissao(
          usuario?.permissoes,
          regra.modulo,
          regra.acao || "visualizar"
        )
      })

      if (!permitido) {
        return res.status(403).json({
          error: "Voce nao tem permissao para executar esta acao"
        })
      }

      next()
    } catch (error) {
      console.error("Erro ao validar permissao:", error)
      res.status(500).json({
        error: "Erro ao validar permissao"
      })
    }
  }
}
