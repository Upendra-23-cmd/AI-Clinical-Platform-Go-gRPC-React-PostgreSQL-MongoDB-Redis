// Patient types
export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  address: string;
  emergency_contact: string;
  allergies: string[];
  chronic_conditions: string[];
  status: 'active' | 'inactive' | 'critical';
  risk_score: number;
  created_at: string;
  updated_at: string;
}

// Appointment types
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  department: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  appointment_type: string;
  notes: string;
  room: string;
  is_telemedicine: boolean;
  meeting_url?: string;
  wait_time_minutes: number;
  created_at: string;
}

// Diagnostic types
export interface DiagnosisItem {
  condition: string;
  confidence: number;
  description: string;
  icd_code: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface SymptomAnalysis {
  session_id: string;
  possible_diagnoses: DiagnosisItem[];
  urgency_level: string;
  recommendation: string;
  follow_up_questions: string[];
  emergency_referral: boolean;
}

export interface RiskAssessment {
  patient_id: string;
  overall_risk_score: number;
  risk_category: 'low' | 'moderate' | 'high' | 'critical';
  risk_factors: RiskFactor[];
  preventive_measures: string[];
  next_screening_date: string;
}

export interface RiskFactor {
  factor: string;
  severity: string;
  recommendation: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  recommendation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  escalate_to_doctor?: boolean;
  urgency?: string;
}

// Analytics types
export interface DashboardMetrics {
  total_patients_today: number;
  appointments_today: number;
  available_beds: number;
  critical_alerts: number;
  avg_wait_time: number;
  patient_satisfaction: number;
  admission_trend: DataPoint[];
  department_stats: DepartmentStat[];
  revenue_this_month: number;
  bed_occupancy_rate: number;
}

export interface DataPoint {
  label: string;
  value: number;
}

export interface DepartmentStat {
  department: string;
  patient_count: number;
  avg_wait_time: number;
  satisfaction_score: number;
  appointments_today: number;
  available_beds: number;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  action_url?: string;
  created_at: string;
}

// Auth types
export interface AuthUser {
  user_id: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
  token: string;
  expires_in: number;
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
