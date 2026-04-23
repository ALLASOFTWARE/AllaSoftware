import { criarVenda, listarVendas } from "../controllers/vendaController.js"
import { auth } from "../middlewares/auth.js"
import { permitirRoles } from "../middlewares/permitirRoles.js"

export default (app) => {
  app.post("/vendas", auth, criarVenda)
  app.get("/vendas", auth, listarVendas)
}