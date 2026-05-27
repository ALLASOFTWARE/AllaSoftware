import { BrowserRouter, Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import EsqueceuSenha from "./pages/EsqueceuSenha"
import ResetarSenha from "./pages/ResetarSenha"
import CadastroEmpresa from "./pages/CadastroEmpresa"

import Dashboard from "./pages/Dashboard"
import Clientes from "./pages/Clientes"
import ClienteDetalhe from "./pages/ClienteDetalhe"
import ClienteFinanceiro from "./pages/ClienteFinanceiro"

import Servicos from "./pages/Servicos"
import Produtos from "./pages/Produtos"
import Vendas from "./pages/Vendas"
import ContasReceber from "./pages/ContasReceber"
import Agendamentos from "./pages/Agendamentos"

import Transacoes from "./pages/Transacoes"
import DashboardFinanceiro from "./pages/DashboardFInanceiro"
import Relatorio from "./pages/Relatorio"
import Comissoes from "./pages/Comissoes"

import Usuarios from "./pages/Usuarios"
import Equipe from "./pages/Equipe"
import Perfil from "./pages/Perfil"
import Empresa from "./pages/Empresa"
import WhatsAppConfig from "./pages/WhatsAppConfig"
import AcessoNegado from "./pages/AcessoNegado"

import PrivateRoute from "./routes/PrivateRoute"
import PermissaoRoute from "./components/PermissaoRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/cadastro-empresa" element={<CadastroEmpresa />} />
        <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />

        {/* Acesso negado */}
        <Route
          path="/acesso-negado"
          element={
            <PrivateRoute>
              <AcessoNegado />
            </PrivateRoute>
          }
        />

        {/* Perfil: todo usuário logado pode acessar */}
        <Route
          path="/perfil"
          element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          }
        />

        <Route
          path="/empresa"
          element={
            <PrivateRoute>
              <Empresa />
            </PrivateRoute>
          }
        />

        <Route
          path="/whatsapp"
          element={
            <PrivateRoute>
              <WhatsAppConfig />
            </PrivateRoute>
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="dashboard">
                <Dashboard />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Clientes */}
        <Route
          path="/clientes"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="clientes">
                <Clientes />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes/:id"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="clientes">
                <ClienteDetalhe />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes/:id/financeiro"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="contasReceber">
                <ClienteFinanceiro />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Serviços */}
        <Route
          path="/servicos"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="servicos">
                <Servicos />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Produtos */}
        <Route
          path="/produtos"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="produtos">
                <Produtos />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Vendas */}
        <Route
          path="/vendas"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="vendas">
                <Vendas />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Contas a receber */}
        <Route
          path="/contas-receber"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="contasReceber">
                <ContasReceber />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Agendamentos */}
        <Route
          path="/agendamentos"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="agendamentos">
                <Agendamentos />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Financeiro */}
        <Route
          path="/transacoes"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="financeiro">
                <Transacoes />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/financeiro/dashboard"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="financeiro">
                <DashboardFinanceiro />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Equipe / Usuários */}
        <Route
          path="/equipe"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="usuarios">
                <Equipe />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Mantém rota antiga de usuários funcionando, caso ainda exista link antigo */}
        <Route
          path="/usuarios"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="usuarios">
                <Usuarios />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/comissoes"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="usuarios">
                <Comissoes />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />

        {/* Relatórios */}
        <Route
          path="/relatorios/financeiro"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="relatorios">
                <Relatorio />
              </PermissaoRoute>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
