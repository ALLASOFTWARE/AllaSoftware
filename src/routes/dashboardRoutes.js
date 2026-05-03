import {
  dashboardFinanceiro,
  dashboardCobrancas
} from "../controllers/dashboardController.js"

import { auth } from "../middlewares/auth.js"
import { permitirRoles } from "../middlewares/permitirRoles.js"

export default (app) => {
  app.get("/dashboard/financeiro", auth, permitirRoles("admin"), dashboardFinanceiro)
  app.get("/dashboard/cobrancas", auth, dashboardCobrancas)
}