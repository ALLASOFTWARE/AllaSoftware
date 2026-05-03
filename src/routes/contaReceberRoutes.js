import {
    criarContaReceber,
    listarContasReceber,
    registrarPagamentoConta
  } from "../controllers/contaReceberController.js"
  
  import { auth } from "../middlewares/auth.js"
  import { permitirRoles } from "../middlewares/permitirRoles.js"
  
  export default (app) => {
    app.post("/contas-receber", auth, criarContaReceber)
    app.get("/contas-receber", auth, listarContasReceber)
    app.post("/contas-receber/:id/pagamentos", auth, registrarPagamentoConta)
  }