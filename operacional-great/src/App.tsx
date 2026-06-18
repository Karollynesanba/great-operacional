import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CommercialProvider } from "@/contexts/CommercialContext";
import { OperationalProvider } from "@/contexts/OperationalContext";
import type { Module } from "@/types";

import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import OperacionalDashboard from "./pages/operacional/Dashboard";
import OperacionalMeuDia from "./pages/operacional/MeuDia";
import OperacionalAgenda from "./pages/operacional/Agenda";
import OperacionalExecucao from "./pages/operacional/Execucao";
import OperacionalCriativos from "./pages/operacional/Criativos";
import OperacionalExecucaoTrafego from "./pages/operacional/clientes/Trafego";
import OperacionalExecucaoAtendimento from "./pages/operacional/clientes/Atendimento";
import OperacionalExecucaoMarketing from "./pages/operacional/clientes/Marketing";
import OperacionalRituais from "./pages/operacional/Rituais";
import OperacionalInteligencia from "./pages/operacional/Inteligencia";
import OperacionalCRM from "./pages/operacional/CRM";
import AlertaCrise from "./pages/operacional/AlertaCrise";
import OperacionalClienteDetalhes from "./pages/operacional/ClienteDetalhes";
import StartMeetingForm from "./pages/operacional/StartMeetingForm";
import OperacionalRegistroAtividades from "./pages/operacional/RegistroAtividades";
import OperacionalReunioes from "./pages/operacional/Reunioes";
import OperacionalAcompanhamentoClientes from "./pages/operacional/AcompanhamentoClientes";
import AcompanhamentoComercial from "./pages/operacional/AcompanhamentoComercial";
import MuralAvisos from "./pages/operacional/MuralAvisos";
import AreaEstudo from "./pages/operacional/AreaEstudo";
import UpgradeAmanda from "./pages/operacional/UpgradeAmanda";
import UpgradeAmandaMinhaPagina from "./pages/operacional/UpgradeAmandaMinhaPagina";
import UpgradeAmandaRoteirosValidados from "./pages/operacional/UpgradeAmandaRoteirosValidados";
import UpgradeAmandaCalendarioGravacao from "./pages/operacional/UpgradeAmandaCalendarioGravacao";
import UpgradeAmandaIdentidadePaleta from "./pages/operacional/UpgradeAmandaIdentidadePaleta";
import UpgradeAmandaEstruturas from "./pages/operacional/UpgradeAmandaEstruturas";
import UpgradeAmandaModelosProntos from "./pages/operacional/UpgradeAmandaModelosProntos.tsx";
import GoalsDashboard from "./pages/ceo/Dashboard";
import GreatStudyAI from "./pages/operacional/GreatStudyAI";
import EstudoIA from "./pages/operacional/EstudoIA";
import ChallengesBoardPage from "./pages/operacional/ChallengesBoard";
import ChampionsGreatLeague from "./pages/operacional/ChampionsGreatLeague";
import AgenteAnalista from "./pages/operacional/AgenteAnalista";
import OperacionalPerfil from "./pages/operacional/Perfil";
import IASuporte from "./pages/tech/IASuporte";
import { AppLayout } from "./components/layout/AppLayout";
import { LogoLoader } from "./components/brand/Logo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro não tratado na aplicação:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-2xl rounded-3xl border border-border bg-white/90 p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-foreground">A aplicação encontrou um erro</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              A tela travou por causa de uma exceção de runtime. Agora o erro vai aparecer aqui para
              conseguirmos corrigir sem deixar a página em branco.
            </p>
            {this.state.error ? (
              <pre className="mt-6 overflow-auto rounded-2xl bg-surface-2 p-4 text-xs text-foreground whitespace-pre-wrap">
                {this.state.error.stack || this.state.error.message}
              </pre>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({
  children,
  allowedModule,
}: {
  children: React.ReactNode;
  allowedModule?: Module;
}) {
  const { isAuthenticated, isLoading, hasAccess, user } = useAuth();
  const canEnterRoute =
    allowedModule === 'OPERACIONAL'
      ? true
      : allowedModule
        ? hasAccess(allowedModule)
        : true;

  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LogoLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedModule && !canEnterRoute) {
    return <Navigate to={allowedModule === "TECH" ? "/tech/ia-suporte" : "/operacional/dashboard"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/operacional"
        element={
          <ProtectedRoute allowedModule="OPERACIONAL">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<OperacionalDashboard />} />
        <Route path="meu-dia" element={<OperacionalMeuDia />} />
        <Route path="agenda" element={<OperacionalAgenda />} />
        <Route path="crm" element={<OperacionalCRM />} />
        <Route path="acompanhamento-comercial" element={<AcompanhamentoComercial />} />
        <Route path="alerta-crise" element={<AlertaCrise />} />
        <Route path="crm/cliente/:clientId" element={<OperacionalClienteDetalhes />} />
        <Route
          path="crm/cliente/:clientId/formulario-start"
          element={<StartMeetingForm />}
        />
        <Route path="execucao" element={<OperacionalExecucao />} />
        <Route path="execucao/criativos" element={<OperacionalCriativos />} />
        <Route path="execucao/trafego" element={<OperacionalExecucaoTrafego />} />
        <Route
          path="execucao/atendimento"
          element={<OperacionalExecucaoAtendimento />}
        />
        <Route path="execucao/marketing" element={<OperacionalExecucaoMarketing />} />
        <Route path="execucao/atividades" element={<OperacionalRegistroAtividades />} />
        <Route path="execucao/acompanhamento-clientes" element={<OperacionalAcompanhamentoClientes />} />
        <Route path="reunioes" element={<OperacionalReunioes />} />
        <Route path="mural-avisos" element={<MuralAvisos />} />
        <Route
          path="area-estudo"
          element={<Navigate to="/operacional/area-estudo/conteudos" replace />}
        />
        <Route path="area-estudo/conteudos" element={<AreaEstudo />} />
        <Route path="area-estudo/ia" element={<GreatStudyAI />} />
        <Route
          path="upgrade-de-amanda"
          element={<Navigate to="/operacional/upgrade-de-amanda/minha-pagina" replace />}
        />
        <Route
          path="upgrade-de-amanda/identidade-paleta"
          element={<UpgradeAmandaIdentidadePaleta />}
        />
        <Route path="upgrade-de-amanda/minha-pagina" element={<UpgradeAmandaMinhaPagina />} />
        <Route
          path="upgrade-de-amanda/roteiros-validados"
          element={<UpgradeAmandaRoteirosValidados />}
        />
        <Route
          path="upgrade-de-amanda/calendario-de-gravacao"
          element={<UpgradeAmandaCalendarioGravacao />}
        />
        <Route
          path="upgrade-de-amanda/estruturas-que-performam"
          element={<UpgradeAmandaEstruturas />}
        />
        <Route
          path="upgrade-de-amanda/modelos-prontos"
          element={<UpgradeAmandaModelosProntos />}
        />
        <Route path="upgrade-de-amanda/home" element={<UpgradeAmanda />} />
        <Route path="great-study-ai" element={<EstudoIA />} />
        <Route path="rituais" element={<OperacionalRituais />} />
        <Route path="inteligencia" element={<OperacionalInteligencia />} />
        <Route path="desafios" element={<ChallengesBoardPage />} />
        <Route path="champions-great-league" element={<ChampionsGreatLeague />} />
        <Route path="ranking" element={<ChampionsGreatLeague />} />
        <Route path="agente-analista" element={<AgenteAnalista />} />
        <Route path="perfil" element={<OperacionalPerfil />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route
        path="/comercial"
        element={
          <ProtectedRoute allowedModule="COMERCIAL">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="meta-agendamentos" replace />} />
        <Route path="meta-agendamentos" element={<GoalsDashboard />} />
        <Route path="dashboards" element={<GoalsDashboard />} />
        <Route path="*" element={<Navigate to="meta-agendamentos" replace />} />
      </Route>

      <Route
        path="/ceo"
        element={
          <ProtectedRoute allowedModule="CEO">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<GoalsDashboard />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route
        path="/tech"
        element={
          <ProtectedRoute allowedModule="TECH">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="ia-suporte" replace />} />
        <Route path="ia-suporte" element={<IASuporte />} />
        <Route path="ia-analista" element={<AgenteAnalista />} />
        <Route path="*" element={<Navigate to="ia-suporte" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    themes={["light", "dark"]}
    storageKey="theme"
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <AuthProvider>
          <CommercialProvider>
            <OperationalProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </OperationalProvider>
          </CommercialProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
