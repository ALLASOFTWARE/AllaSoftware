import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import EsqueceuSenha from "./pages/EsqueceuSenha"
import ResetarSenha from "./pages/ResetarSenha"
import CadastroEmpresa from "./pages/CadastroEmpresa"
import Dashboard from "./pages/Dashboard"
import Clientes from "./pages/Clientes"
import Transacoes from "./pages/Transacoes"
import ContasReceber from "./pages/ContasReceber"
import Usuarios from "./pages/Usuarios"
import DashboardFinanceiro from "./pages/DashboardFInanceiro"
import Relatorio from "./pages/Relatorio"
import PrivateRoute from "./routes/PrivateRoute"
import ClienteDetalhe from "./pages/ClienteDetalhe"
import Servicos from "./pages/Servicos"
import Produtos from "./pages/Produtos"
import Vendas from "./pages/Vendas"
import ClienteFinanceiro from "./pages/ClienteFinanceiro" 
import Agendamentos from "./pages/Agendamentos"
import Perfil from "./pages/Perfil"
import Equipe from "./pages/Equipe"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro-empresa" element={<CadastroEmpresa />} />
        <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <PrivateRoute>
              <Clientes />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes/:id"
          element={
            <PrivateRoute>
              <ClienteDetalhe />
            </PrivateRoute>
          }
        />

        <Route
          path="/servicos"
          element={
            <PrivateRoute>
              <Servicos />
            </PrivateRoute>
          }
        />

        <Route 
          path="/produtos" 
          element={
            <PrivateRoute>  
              <Produtos />
                </PrivateRoute>
          }   
        />
        <Route
          path="/vendas"
          element={
            <PrivateRoute>
              <Vendas />
            </PrivateRoute>
          }
      />

        <Route
          path="/transacoes"
          element={
            <PrivateRoute>
              <Transacoes />
            </PrivateRoute>
          }
        />

        <Route
          path="/contas-receber"
          element={
            <PrivateRoute>
              <ContasReceber />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes/:id/financeiro"
          element={
            <PrivateRoute>
              <ClienteFinanceiro />
            </PrivateRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <PrivateRoute>
              <Usuarios />
            </PrivateRoute>
          }
        />

        <Route
          path="/financeiro/dashboard"
          element={
            <PrivateRoute>
              <DashboardFinanceiro />
            </PrivateRoute>
          }
        />

        <Route
          path="/agendamentos"
          element={
            <PrivateRoute>
              <Agendamentos />
            </PrivateRoute>
          }
        />

        <Route
          path="/relatorios/financeiro"
          element={
            <PrivateRoute>
              <Relatorio/>
            </PrivateRoute>
          }
        />

        <Route 
          path="/perfil"
          element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          }
        />
        <Route 
          path="/equipe"
          element={
            <PrivateRoute>
              <Equipe />
            </PrivateRoute>
          }
        />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App