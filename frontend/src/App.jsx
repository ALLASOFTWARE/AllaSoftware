import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import EsqueceuSenha from "./pages/EsqueceuSenha"
import ResetarSenha from "./pages/ResetarSenha"
import PlataformaLogin from "./pages/PlataformaLogin"

import PrivateRoute from "./routes/PrivateRoute"
import PlatformPrivateRoute from "./routes/PlatformPrivateRoute"
import PermissaoRoute from "./components/PermissaoRoute"

const PlataformaEmpresas = lazy(() => import("./pages/PlataformaEmpresas"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const Clientes = lazy(() => import("./pages/Clientes"))
const ClienteDetalhe = lazy(() => import("./pages/ClienteDetalhe"))
const ClienteFinanceiro = lazy(() => import("./pages/ClienteFinanceiro"))
const Servicos = lazy(() => import("./pages/Servicos"))
const Produtos = lazy(() => import("./pages/Produtos"))
const Vendas = lazy(() => import("./pages/Vendas"))
const ContasReceber = lazy(() => import("./pages/ContasReceber"))
const ContasPagar = lazy(() => import("./pages/ContasPagar"))
const Agendamentos = lazy(() => import("./pages/Agendamentos"))
const Transacoes = lazy(() => import("./pages/Transacoes"))
const DashboardFinanceiro = lazy(() => import("./pages/DashboardFInanceiro"))
const Relatorio = lazy(() => import("./pages/Relatorio"))
const Comissoes = lazy(() => import("./pages/Comissoes"))
const Usuarios = lazy(() => import("./pages/Usuarios"))
const Equipe = lazy(() => import("./pages/Equipe"))
const Perfil = lazy(() => import("./pages/Perfil"))
const Empresa = lazy(() => import("./pages/Empresa"))
const WhatsAppConfig = lazy(() => import("./pages/WhatsAppConfig"))
const AcessoNegado = lazy(() => import("./pages/AcessoNegado"))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CarregandoRota />}>
        <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/cadastro-empresa" element={<Navigate to="/" replace />} />
        <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />
        <Route path="/plataforma/login" element={<PlataformaLogin />} />
        <Route
          path="/plataforma/empresas"
          element={
            <PlatformPrivateRoute>
              <PlataformaEmpresas />
            </PlatformPrivateRoute>
          }
        />

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

        {/* Contas a pagar */}
        <Route
          path="/contas-pagar"
          element={
            <PrivateRoute>
              <PermissaoRoute modulo="contasPagar">
                <ContasPagar />
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
      </Suspense>
    </BrowserRouter>
  )
}

function CarregandoRota() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] px-4 py-6">
      <div className="mx-auto max-w-6xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-xl bg-gray-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-white shadow-sm" />
      </div>
    </div>
  )
}

export default App
