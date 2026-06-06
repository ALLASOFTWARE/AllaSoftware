import { alertasOperacionais, alertasVencimento } from "../controllers/alertaController.js"
import { auth } from "../middlewares/auth.js"
import { permitirQualquerPermissao } from "../middlewares/permitirPermissao.js"

export default (app) => {
  app.get(
    "/alertas/vencimento",
    auth,
    permitirQualquerPermissao("dashboard", "contasReceber", "financeiro"),
    alertasVencimento
  )

  app.get(
    "/alertas/operacionais",
    auth,
    permitirQualquerPermissao(
      "dashboard",
      "contasReceber",
      "contasPagar",
      "financeiro",
      "agendamentos",
      "produtos",
      "clientes"
    ),
    alertasOperacionais
  )
}
