import type { User as FirebaseAuthUser } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

export type Role = "patient" | "caretaker" | "medical";

export type DeviceType = "smartwatch" | "fitness_tracker" | "blood_pressure_monitor" | "glucose_monitor" | "pulse_oximeter" | "ecg_monitor" | "other";

export type DeviceStatus = "online" | "offline" | "syncing" | "error";

export type DoctorAvailability = "available" | "busy" | "offline";

export type CaretakerAvailability = "available" | "busy" | "offline";

export type CareTeamRole = "doctor" | "caretaker";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSyncTime: Timestamp | Date;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  addedAt: Timestamp | Date;
}

export interface AppUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
  assignedDoctor?: string;
  assignedDoctorId?: string;
  assignedCaretakerId?: string;
  connectedDevices?: Device[];
  activeDeviceId?: string;
  vitals?: Record<string, unknown>;
  bloodType?: string;
  dateOfBirth?: string;
  knownAllergies?: string;
  emergencyAlerts?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface AuthContextValue {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Dashboard Types
export interface VitalData {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenLevel?: number;
  temperature?: number;
  glucose?: number;
  respiration?: number;
  timestamp?: Timestamp | Date;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: Timestamp | Date;
  patientId?: string;
  patientName?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  lastVitals?: VitalData;
  status: "stable" | "warning" | "critical";
  assignedDoctorId?: string;
  assignedCaretakerId?: string;
  assignmentReason?: AssignmentReason;
  assignedAt?: Timestamp | Date;
  chronicConditions?: string[];
}

export interface DoctorProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string;
  yearsInPractice: number;
  hospitalAffiliation?: string;
  licenseId?: string;
  availability: DoctorAvailability;
  maxPatients: number;
  currentPatientCount: number;
}

export interface CaretakerProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  relationshipToPatient?: string;
  experienceYears: number;
  certified: boolean;
  availability: CaretakerAvailability;
  maxPatients: number;
  currentPatientCount: number;
}

export interface AssignmentReason {
  score: number;
  role: CareTeamRole;
  factors: {
    specializationMatch?: boolean;
    matchedConditions?: string[];
    experienceMatch?: boolean;
    certificationBonus?: number;
    availabilityBonus: number;
    workloadScore: number;
    experienceScore: number;
  };
  assignedBy: "system" | "manual" | "invitation" | "escalation";
  timestamp: Timestamp | Date;
  escalatedFrom?: string; // If escalated from caretaker to doctor
}

export interface AssignmentRequest {
  patientId: string;
  careTeamRole: CareTeamRole; // "doctor" or "caretaker"
  preferredSpecialization?: string;
  urgency?: "routine" | "urgent" | "emergency";
  autoEscalate?: boolean; // Whether to auto-escalate to doctor if needed
}

export interface AssignmentResponse {
  success: boolean;
  assignedId?: string;
  assignedName?: string;
  role?: CareTeamRole;
  reason?: AssignmentReason;
  message?: string;
}

export interface EscalationCriteria {
  criticalAlerts: number; // Number of critical alerts that trigger escalation
  consecutiveWarnings: number; // Consecutive warning status days
  chronicConditionSeverity: string[]; // Conditions that require doctor oversight
  patientStatus: "stable" | "warning" | "critical";
}

export interface DeviceContextValue {
  activeDevice: Device | null;
  setActiveDevice: (device: Device | null) => void;
  devices: Device[];
  addDevice: (device: Omit<Device, 'id' | 'addedAt'>) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: DeviceStatus) => Promise<void>;
  refreshDevices: () => Promise<void>;
  connectBluetoothDevice: (deviceType: 'heart_rate' | 'blood_pressure' | 'glucose' | 'temperature' | 'pulse_oximeter') => Promise<{ id: string; name: string; type: string }>;
  connectGoogleFit: () => Promise<boolean>;
  disconnectBluetoothDevice: (deviceId: string) => Promise<void>;
  disconnectGoogleFit: () => Promise<void>;
  connectAppleHealth: () => Promise<boolean>;
  disconnectAppleHealth: () => Promise<void>;
  manualSync: () => Promise<void>;
}
