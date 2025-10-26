import type { User as FirebaseAuthUser } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

export type Role = "patient" | "caretaker" | "medical";

export type DeviceType = "smartwatch" | "fitness_tracker" | "blood_pressure_monitor" | "glucose_monitor" | "pulse_oximeter" | "ecg_monitor" | "other";

export type DeviceStatus = "online" | "offline" | "syncing" | "error";

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
}

export interface DeviceContextValue {
  activeDevice: Device | null;
  setActiveDevice: (device: Device | null) => void;
  devices: Device[];
  addDevice: (device: Omit<Device, 'id' | 'addedAt'>) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: DeviceStatus) => Promise<void>;
  refreshDevices: () => Promise<void>;
}
