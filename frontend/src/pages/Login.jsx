import { useState } from "react"
import { Link } from "react-router-dom"
import api from "../services/api"

export default function Login() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const response = await api.post("/login-usuario", {
        email,
        senha
      })

      const { accessToken, usuario } = response.data

      console.log("Login response:", response.data)
      console.log("AccessToken salvo:", accessToken)

      localStorage.setItem("token", accessToken)
      localStorage.setItem("usuario", JSON.stringify(usuario))

      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Erro no login:", error)
      alert(error.response?.data?.error || "Erro no login")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-center text-[#2D2E47] mb-6">
          Sistema ALLA
        </h1>

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
          className="w-full bg-[#3E7996] text-white py-3 rounded-lg font-medium hover:opacity-90"
        >
          Entrar
        </button>

        <p className="text-sm text-center text-gray-600 mt-4">
          Ainda não tem empresa?{" "}
          <Link
            to="/cadastro-empresa"
            className="text-[#3E7996] font-medium hover:underline"
          >
            Cadastrar empresa
          </Link>
        </p>
      </form>
    </div>
  )
}