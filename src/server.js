import express from "express"
import cors from "cors"
import authRoutes from "./routes/authRoutes.js"
import { auth } from "./middlewares/auth.js"
import clienteRoutes from "./routes/clienteRoutes.js"
import transacaoRoutes from "./routes/transacaoRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import contaReceberRoutes from "./routes/contaReceberRoutes.js"
import alertaRoutes from "./routes/alertaRoutes.js"
import usuarioRoutes from "./routes/usuarioRoutes.js"
import servicoRoutes from "./routes/servicoRoutes.js"
import produtoRoutes from "./routes/produtoRoutes.js"
import vendaRoutes from "./routes/vendaRoutes.js"

const app = express() 

app.use(cors())
app.use(express.json())

authRoutes(app)
clienteRoutes(app)
transacaoRoutes(app)
dashboardRoutes(app)
contaReceberRoutes(app)
alertaRoutes(app)
usuarioRoutes(app)
servicoRoutes (app)
produtoRoutes(app)
vendaRoutes(app)

//  rota de teste
app.get("/teste", auth, (req, res) => {
  res.json({
    message: "Acesso liberado",
    empresaId: req.empresaId
  })
})


app.listen(3000, () => {
  console.log("Servidor rodando 🚀")
})
