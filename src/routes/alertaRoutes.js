import { alertasVencimento } from "../controllers/alertaController.js"
import { auth } from "../middlewares/auth.js"
import { permitirQualquerPermissao } from "../middlewares/permitirPermissao.js"

export default (app) => {
  app.get(
    "/alertas/vencimento",
    auth,
    permitirQualquerPermissao("dashboard", "contasReceber", "financeiro"),
    alertasVencimento
  )
}
