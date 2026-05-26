import { useState } from "react"
import api from "../services/api"

export default function CadastroEmpresa() {
  const [nomeEmpresa, setNomeEmpresa] = useState("")
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [cadastrando, setCadastrando] = useState(false)

  const handleCadastro = async (e) => {
    e.preventDefault()
    if (cadastrando) return

    try {
      setCadastrando(true)
      const response = await api.post("/register", {
        nomeEmpresa,
        nomeUsuario,
        email,
        senha
      })

      console.log("Cadastro realizado:", response.data)
      alert("Empresa cadastrada com sucesso! Faça o login do admin.")

      window.location.href = "/"
    } catch (error) {
      console.error("Erro no cadastro:", error)

      const mensagem = error.response?.data?.error || "Erro ao cadastrar empresa"
      alert(mensagem)

      if (
        mensagem.includes("Já existe uma empresa cadastrada com esse email") ||
        mensagem.includes("Já existe um usuário cadastrado com esse email")
      ) {
        window.location.href = "/"
      }
    } finally {
      setCadastrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleCadastro}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-center text-[#2D2E47] mb-6">
          Cadastrar Empresa
        </h1>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Nome da empresa
          </label>
          <input
            type="text"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            placeholder="Digite o nome da empresa"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Nome do admin
          </label>
          <input
            type="text"
            value={nomeUsuario}
            onChange={(e) => setNomeUsuario(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            placeholder="Digite o nome do admin"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            placeholder="Digite o email"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
            placeholder="Digite a senha"
          />
        </div>

        <button
          type="submit"
          disabled={cadastrando}
          className="w-full bg-[#3E7996] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {cadastrando ? "Cadastrando..." : "Cadastrar"}
        </button>

        <p className="text-sm text-center text-gray-600 mt-4">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="text-[#3E7996] font-medium hover:underline"
          >
            Entrar
          </button>
        </p>
      </form>
    </div>
  )
}
