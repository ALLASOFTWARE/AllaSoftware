import {
    criarProduto,
    listarProdutos,
    atualizarProduto,
    excluirProduto
  } from "../controllers/produtoController.js"
  
  import { auth } from "../middlewares/auth.js"
  import { permitirRoles } from "../middlewares/permitirRoles.js"
  
  export default (app) => {
    app.post("/produtos", auth, permitirRoles("admin"), criarProduto)
    app.get("/produtos", auth, listarProdutos)
    app.put("/produtos/:id", auth, permitirRoles("admin"), atualizarProduto)
    app.delete("/produtos/:id", auth, permitirRoles("admin"), excluirProduto)
  }