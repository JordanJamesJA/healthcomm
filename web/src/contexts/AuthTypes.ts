import type { User as FirebaseAuthUser } from "firebase/auth";

export type Role = "patient" | "caretaker" | "medical";

export interface AppUser {
  uid: string;
  name?: string;
  email?: string;
  role?: Role;
  assignedDoctorId?: string;
  assignedCaretakerId?: string;
  connectedDevices?: string[];
  vitals?: Record<string, unknown>;
  emergencyAlerts?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface AuthContextValue {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}
