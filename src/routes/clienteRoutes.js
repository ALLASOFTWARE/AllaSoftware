import {
    criarCliente,
    listarClientes,
    atualizarCliente,
    deletarCliente, 
    detalharCliente
  } from "../controllers/clienteController.js"
  
  import { auth } from "../middlewares/auth.js"
  
  export default (app) => {
    app.post("/clientes", auth, criarCliente)
    app.get("/clientes", auth, listarClientes)    
    app.get("/clientes/:id/detalhes", auth, detalharCliente)
    app.put("/clientes/:id", auth, atualizarCliente)
    app.delete("/clientes/:id", auth, deletarCliente)
  }