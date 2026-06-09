import axios from "axios"

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"

const api = axios.create({ baseURL })
const apiSemInterceptors = axios.create({ baseURL })

const rotasPublicas = [
  "/login",
  "/login-usuario",
  "/plataforma/login",
  "/register",
  "/esqueceu-senha",
  "/resetar-senha",
  "/refresh-token"
]

const obterCaminho = (url = "") => {
  try {
    return new URL(url, baseURL).pathname
  } catch {
    return url
  }
}

const rotaPublica = (url) => rotasPublicas.includes(obterCaminho(url))

const limparSessao = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("usuario")
}

const redirecionarLogin = () => {
  let usuario = null

  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "null")
  } catch {
    usuario = null
  }

  limparSessao()
  window.location.href = usuario?.tipo === "plataforma" ? "/plataforma/login" : "/"
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")

  if (token && !rotaPublica(config.url)) {
    config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      rotaPublica(originalRequest?.url)
    ) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem("refreshToken")

    if (!refreshToken) {
      redirecionarLogin()
      return Promise.reject(error)
    }

    try {
      originalRequest._retry = true
      const response = await apiSemInterceptors.post("/refresh-token", { refreshToken })
      const novoAccessToken = response.data?.accessToken

      if (!novoAccessToken) {
        redirecionarLogin()
        return Promise.reject(error)
      }

      localStorage.setItem("token", novoAccessToken)
      originalRequest.headers = originalRequest.headers || {}
      originalRequest.headers.Authorization = `Bearer ${novoAccessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      redirecionarLogin()
      return Promise.reject(refreshError)
    }
  }
)

export default api
