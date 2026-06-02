import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import authRoutes from "./routes/authRoutes.js"
import passwordRoutes from "./routes/passwordRoutes.js"
import { auth } from "./middlewares/auth.js"
import clienteRoutes from "./routes/clienteRoutes.js"
import transacaoRoutes from "./routes/transacaoRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import contaReceberRoutes from "./routes/contaReceberRoutes.js"
import contaPagarRoutes from "./routes/contaPagarRoutes.js"
import alertaRoutes from "./routes/alertaRoutes.js"
import usuarioRoutes from "./routes/usuarioRoutes.js"
import servicoRoutes from "./routes/servicoRoutes.js"
import produtoRoutes from "./routes/produtoRoutes.js"
import vendaRoutes from "./routes/vendaRoutes.js"
import { securityHeaders } from "./middlewares/security.js"
import { limiterGeral, limiterLogin } from "./middlewares/rateLimiter.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import relatorioRoutes from "./routes/relatorioRoutes.js"
import agendamentoRoutes from "./routes/agendamentoRoutes.js"
import comissaoRoutes from "./routes/comissaoRoutes.js"
import whatsappRoutes from "./routes/whatsappRoutes.js"
import { iniciarLembretesWhatsApp } from "./services/whatsappReminderJob.js"
import plataformaRoutes from "./routes/plataformaRoutes.js"

const app = express()

app.set("trust proxy", 1)

// Segurança
app.use(securityHeaders)
app.use(helmet())

//  CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// Middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// Rate Limiting
app.use(limiterGeral)

//  Rotas
plataformaRoutes(app)
authRoutes(app)
passwordRoutes(app)
clienteRoutes(app)
transacaoRoutes(app)
dashboardRoutes(app)
contaReceberRoutes(app)
contaPagarRoutes(app)
alertaRoutes(app)
usuarioRoutes(app)
servicoRoutes(app)
produtoRoutes(app)
vendaRoutes(app)
relatorioRoutes(app)
agendamentoRoutes(app)
comissaoRoutes(app)
whatsappRoutes(app)

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

//  Rota de teste
app.get("/teste", auth, (req, res) => {
  res.json({
    message: "Acesso liberado",
    empresaId: req.empresaId
  })
})

//  Rota 404
app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.path,
    method: req.method
  })
})

//  Tratamento de Erros Global
app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || "development"}`)
  iniciarLembretesWhatsApp()
})
