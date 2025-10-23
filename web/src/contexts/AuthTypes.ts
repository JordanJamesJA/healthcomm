import type { User as FirebaseAuthUser } from "firebase/auth";

export type Role = "patient" | "caretaker" | "medical";

export interface AppUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
  assignedDoctor?: string;
  assignedDoctorId?: string;
  assignedCaretakerId?: string;
  connectedDevices?: string[];
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
