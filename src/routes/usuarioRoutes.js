import {
  criarUsuario,
  listarUsuarios,
  atualizarUsuario,
  alterarStatusUsuario,
  deletarUsuario,
  verPerfil,
  atualizarPerfil
} from "../controllers/usuarioController.js"

import { auth } from "../middlewares/auth.js"
import { permitirRoles } from "../middlewares/permitirRoles.js"

export default (app) => {
  // Perfil do usuário logado
  app.get("/perfil", auth, verPerfil)
  app.put("/perfil", auth, atualizarPerfil)

  // Equipe / usuários da empresa
  app.get("/usuarios", auth, permitirRoles("admin"), listarUsuarios)
  app.post("/usuarios", auth, permitirRoles("admin"), criarUsuario)
  app.put("/usuarios/:id", auth, permitirRoles("admin"), atualizarUsuario)
  app.patch("/usuarios/:id/status", auth, permitirRoles("admin"), alterarStatusUsuario)

  // Pode manter por enquanto, mas vamos usar mais "inativar" do que excluir
  app.delete("/usuarios/:id", auth, permitirRoles("admin"), deletarUsuario)
}