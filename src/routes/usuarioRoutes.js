import {
  criarUsuario,
  listarUsuarios,
  atualizarUsuario,
  alterarStatusUsuario,
  deletarUsuario,
  verPerfil,
  atualizarPerfil,
  listarProfissionais
} from "../controllers/usuarioController.js"

import { auth } from "../middlewares/auth.js"
import {
  permitirPermissao,
  permitirQualquerPermissao
} from "../middlewares/permitirPermissao.js"

export default (app) => {
  // Perfil do usuário logado
  app.get("/perfil", auth, verPerfil)
  app.put("/perfil", auth, atualizarPerfil)

  // Equipe / usuários da empresa
  app.get("/usuarios", auth, permitirPermissao("usuarios"), listarUsuarios)
  app.post("/usuarios", auth, permitirPermissao("usuarios", "criar"), criarUsuario)
  app.put("/usuarios/:id", auth, permitirPermissao("usuarios", "editar"), atualizarUsuario)
  app.patch("/usuarios/:id/status", auth, permitirPermissao("usuarios", "editar"), alterarStatusUsuario)

  // Pode manter por enquanto, mas vamos usar mais "inativar" do que excluir
  app.delete("/usuarios/:id", auth, permitirPermissao("usuarios", "excluir"), deletarUsuario)

  app.get(
    "/profissionais",
    auth,
    permitirQualquerPermissao("agendamentos", "financeiro", "usuarios"),
    listarProfissionais
  )
}
