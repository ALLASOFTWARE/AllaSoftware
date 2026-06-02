import {
  atualizarEmpresaPlataforma,
  criarEmpresaPlataforma,
  listarEmpresasPlataforma,
  loginPlataforma,
  perfilPlataforma,
  resetarSenhaAdminEmpresa
} from "../controllers/plataformaController.js"
import { authPlataforma } from "../middlewares/authPlataforma.js"
import { limiterLogin } from "../middlewares/rateLimiter.js"

export default (app) => {
  app.post("/plataforma/login", limiterLogin, loginPlataforma)
  app.get("/plataforma/perfil", authPlataforma, perfilPlataforma)
  app.get("/plataforma/empresas", authPlataforma, listarEmpresasPlataforma)
  app.post("/plataforma/empresas", authPlataforma, criarEmpresaPlataforma)
  app.put("/plataforma/empresas/:id", authPlataforma, atualizarEmpresaPlataforma)
  app.post("/plataforma/empresas/:id/resetar-senha", authPlataforma, resetarSenhaAdminEmpresa)
}
