import { useState } from "react"
import api from "../services/api"
import BrandLogo from "../components/BrandLogo"
import ModalAviso from "../components/ModalAviso"

export default function PlataformaLogin() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [entrando, setEntrando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (entrando) return

    try {
      setEntrando(true)
      const response = await api.post("/plataforma/login", { email, senha })
      const { accessToken, usuario } = response.data

      localStorage.setItem("token", accessToken)
      localStorage.setItem("usuario", JSON.stringify(usuario))
      window.location.href = "/plataforma/empresas"
    } catch (error) {
      console.error("Erro no login da plataforma:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro no login da plataforma" })
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07172D] px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-white/70"
      >
        <BrandLogo variant="stacked" tone="dark" className="mx-auto mb-6 h-32 w-48" />

        <h1 className="text-xl font-bold text-center text-[#2D2E47] mb-1">
          Painel da Plataforma
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Acesso administrativo AllaSoftware
        </p>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            placeholder="Seu email administrativo"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            placeholder="Sua senha"
            required
          />
        </div>

        <button
          type="submit"
          disabled={entrando}
          className="w-full bg-[#3E7996] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="w-full text-sm text-gray-500 hover:text-[#3E7996] mt-4"
        >
          Voltar ao login das empresas
        </button>
      </form>

      {aviso && <ModalAviso {...aviso} onClose={() => setAviso(null)} />}
    </div>
  )
}
