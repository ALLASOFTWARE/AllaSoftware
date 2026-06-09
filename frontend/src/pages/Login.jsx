import { useState } from "react"
import { Link } from "react-router-dom"
import api from "../services/api"
import BrandLogo from "../components/BrandLogo"
import ModalAviso from "../components/ModalAviso"

export default function Login() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [aviso, setAviso] = useState(null)
  const [entrando, setEntrando] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (entrando) return

    try {
      setEntrando(true)
      const response = await api.post("/login-usuario", {
        email,
        senha
      })

      const { accessToken, refreshToken, usuario } = response.data

      console.log("Login response:", response.data)
      console.log("AccessToken salvo:", accessToken)

      localStorage.setItem("token", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("usuario", JSON.stringify(usuario))

      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Erro no login:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro no login" })
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
        <BrandLogo variant="stacked" tone="dark" className="mx-auto mb-7 h-36 w-52" />

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            placeholder="Digite seu email"
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Link
            to="/esqueceu-senha"
            className="text-xs text-[#3E7996] hover:underline mt-1 inline-block"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <button
          type="submit"
          disabled={entrando}
          className="w-full bg-[#3E7996] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs text-center text-gray-500 mt-4">
          O acesso da empresa e criado pela AllaSoftware.
        </p>
      </form>
      {aviso && (
        <ModalAviso
          {...aviso}
          onClose={() => setAviso(null)}
        />
      )}
    </div>
  )
}
