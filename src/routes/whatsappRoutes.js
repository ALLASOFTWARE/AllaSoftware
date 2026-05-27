import {
  obterConfiguracaoWhatsApp,
  salvarConfiguracaoWhatsApp,
  testarConfiguracaoWhatsApp,
  listarMensagensWhatsApp
} from "../controllers/whatsappController.js"
import { auth } from "../middlewares/auth.js"
import { permitirRoles } from "../middlewares/permitirRoles.js"

export default (app) => {
  app.get("/whatsapp/config", auth, permitirRoles("admin"), obterConfiguracaoWhatsApp)
  app.put("/whatsapp/config", auth, permitirRoles("admin"), salvarConfiguracaoWhatsApp)
  app.post("/whatsapp/teste", auth, permitirRoles("admin"), testarConfiguracaoWhatsApp)
  app.get("/whatsapp/mensagens", auth, permitirRoles("admin"), listarMensagensWhatsApp)
}
