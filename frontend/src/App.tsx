import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/common/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import PatientsPage from '@/pages/PatientsPage';
import PatientDetailPage from '@/pages/PatientDetailPage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import DiagnosticsPage from '@/pages/DiagnosticsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import AIChatPage from '@/pages/AIChatPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="diagnostics" element={<DiagnosticsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="ai-chat" element={<AIChatPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f1117',
            color: '#e2e8f0',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
