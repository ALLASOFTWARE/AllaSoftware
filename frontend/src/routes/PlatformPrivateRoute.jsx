import { Navigate } from "react-router-dom"

export default function PlatformPrivateRoute({ children }) {
  const token = localStorage.getItem("token")
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")

  if (!token || usuario?.tipo !== "plataforma") {
    return <Navigate to="/plataforma/login" replace />
  }

  return children
}
