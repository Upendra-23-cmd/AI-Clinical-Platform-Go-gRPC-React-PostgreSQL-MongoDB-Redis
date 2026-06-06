import axios from 'axios';
import type {
  Patient, Appointment, DashboardMetrics,
  SymptomAnalysis, RiskAssessment, DrugInteraction,
  ChatMessage, AuthUser, Notification
} from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('healthos-auth');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.user?.token) {
      config.headers.Authorization = `Bearer ${state.user.token}`;
    }
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('healthos-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
};

// ── Patients ────────────────────────────────────────────────────────────────
export const patientApi = {
  list: async (page = 1, pageSize = 20) => {
    const { data } = await api.get('/patients', { params: { page, page_size: pageSize } });
    return data;
  },
  get: async (id: string): Promise<Patient> => {
    const { data } = await api.get(`/patients/${id}`);
    return data.patient;
  },
  create: async (payload: Partial<Patient>): Promise<Patient> => {
    const { data } = await api.post('/patients', payload);
    return data.patient;
  },
  update: async (id: string, payload: Partial<Patient>): Promise<Patient> => {
    const { data } = await api.put(`/patients/${id}`, payload);
    return data.patient;
  },
  search: async (query: string, page = 1) => {
    const { data } = await api.get('/patients/search', { params: { query, page } });
    return data;
  },
  getMedicalHistory: async (id: string) => {
    const { data } = await api.get(`/patients/${id}/medical-history`);
    return data;
  },
};

// ── Appointments ─────────────────────────────────────────────────────────────
export const appointmentApi = {
  list: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/appointments', { params });
    return data;
  },
  get: async (id: string): Promise<Appointment> => {
    const { data } = await api.get(`/appointments/${id}`);
    return data.appointment;
  },
  create: async (payload: Partial<Appointment>): Promise<Appointment> => {
    const { data } = await api.post('/appointments', payload);
    return data.appointment;
  },
  update: async (id: string, payload: Partial<Appointment>): Promise<Appointment> => {
    const { data } = await api.put(`/appointments/${id}`, payload);
    return data.appointment;
  },
  cancel: async (id: string, reason: string) => {
    const { data } = await api.post(`/appointments/${id}/cancel`, { reason });
    return data;
  },
  checkIn: async (id: string, patientId: string) => {
    const { data } = await api.post(`/appointments/${id}/check-in`, { patient_id: patientId });
    return data;
  },
  getAvailableSlots: async (doctorId: string, date: string) => {
    const { data } = await api.get('/appointments/slots', { params: { doctor_id: doctorId, date } });
    return data;
  },
};

// ── AI Diagnostics ───────────────────────────────────────────────────────────
export const diagnosticApi = {
  analyzeSymptoms: async (payload: {
    patient_id: string;
    symptoms: string[];
    age: string;
    gender: string;
    existing_conditions?: string[];
    current_medications?: string[];
  }): Promise<SymptomAnalysis> => {
    const { data } = await api.post('/diagnostics/analyze', payload);
    return data;
  },

  getRiskAssessment: async (payload: {
    patient_id: string;
    conditions: string[];
    age: string;
    gender: string;
    lifestyle_factors?: string;
    family_history?: string;
  }): Promise<RiskAssessment> => {
    const { data } = await api.post('/diagnostics/risk-assessment', payload);
    return data;
  },

  checkDrugInteractions: async (medications: string[]): Promise<{
    interactions: DrugInteraction[];
    safety_summary: string;
    warnings: string[];
  }> => {
    const { data } = await api.post('/diagnostics/drug-interactions', { medications });
    return data;
  },

  chat: async (patientId: string, message: string, history: ChatMessage[]): Promise<ChatMessage> => {
    const { data } = await api.post('/diagnostics/chat', {
      patient_id: patientId,
      message,
      history,
    });
    return data;
  },

  generateSummary: async (patientId: string): Promise<{
    summary: string;
    key_concerns: string[];
    recommendations: string[];
    next_steps: string;
  }> => {
    const { data } = await api.post('/diagnostics/summary', { patient_id: patientId });
    return data;
  },
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: async (): Promise<DashboardMetrics> => {
    const { data } = await api.get('/analytics/dashboard');
    return data;
  },
  getPatientTrends: async (period: string, metric: string) => {
    const { data } = await api.get('/analytics/trends', { params: { period, metric } });
    return data;
  },
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationApi = {
  list: async (userId: string): Promise<{ notifications: Notification[]; total: number }> => {
    const { data } = await api.get('/notifications/', { params: { user_id: userId } });
    return data;
  },
  send: async (payload: Partial<Notification>) => {
    const { data } = await api.post('/notifications/send', payload);
    return data;
  },
};

export default api;
