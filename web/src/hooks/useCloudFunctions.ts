/**
 * Custom React hooks for calling Firebase Cloud Functions
 */

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

// Type definitions for Cloud Function requests/responses
interface SendInvitationRequest {
  recipientEmail: string;
  type: "caretaker" | "doctor";
  message?: string;
}

interface SendInvitationResponse {
  success: boolean;
  invitationId: string;
}

interface RespondToInvitationRequest {
  invitationId: string;
  action: "accept" | "decline";
}

interface RespondToInvitationResponse {
  success: boolean;
}

interface ExportVitalsDataRequest {
  patientId: string;
  startDate?: string;
  endDate?: string;
  format?: "json" | "csv";
}

interface ExportVitalsDataResponse {
  success: boolean;
  data: unknown[];
  count: number;
  patientName: string;
}

interface VerifyMedicalCredentialsRequest {
  licenseId: string;
  specialization?: string;
}

interface VerifyMedicalCredentialsResponse {
  success: boolean;
  status: string;
  message: string;
}

interface AssignCareTeamMemberRequest {
  patientId: string;
  careTeamRole: "doctor" | "caretaker";
  preferredSpecialization?: string;
  urgency?: "routine" | "urgent" | "emergency";
  autoEscalate?: boolean;
}

interface AssignCareTeamMemberResponse {
  success: boolean;
  assignedId?: string;
  assignedName?: string;
  role?: "doctor" | "caretaker";
  reason?: {
    score: number;
    role: "doctor" | "caretaker";
    factors: {
      specializationMatch?: boolean;
      matchedConditions?: string[];
      certificationBonus?: number;
      availabilityBonus: number;
      workloadScore: number;
      experienceScore: number;
    };
    assignedBy: string;
    timestamp: unknown;
  };
  message?: string;
}

interface UpdateAvailabilityRequest {
  availability: "available" | "busy" | "offline";
}

interface UpdateAvailabilityResponse {
  success: boolean;
  availability: string;
}

interface EscalateToDoctorRequest {
  patientId: string;
  reason?: string;
}

interface EscalateToDoctorResponse {
  success: boolean;
  doctorId?: string;
  doctorName?: string;
  message?: string;
}

/**
 * Hook for sending invitations to caretakers or doctors
 */
export function useSendInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendInvitation = async (data: SendInvitationRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<SendInvitationRequest, SendInvitationResponse>(
        functions,
        "sendInvitation"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to send invitation");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { sendInvitation, loading, error };
}

/**
 * Hook for accepting or declining invitations
 */
export function useRespondToInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const respondToInvitation = async (data: RespondToInvitationRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<RespondToInvitationRequest, RespondToInvitationResponse>(
        functions,
        "respondToInvitation"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to respond to invitation");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { respondToInvitation, loading, error };
}

/**
 * Hook for exporting patient vitals data
 */
export function useExportVitalsData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportVitalsData = async (data: ExportVitalsDataRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<ExportVitalsDataRequest, ExportVitalsDataResponse>(
        functions,
        "exportVitalsData"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to export vitals data");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { exportVitalsData, loading, error };
}

/**
 * Hook for verifying medical professional credentials
 */
export function useVerifyMedicalCredentials() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const verifyCredentials = async (data: VerifyMedicalCredentialsRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<VerifyMedicalCredentialsRequest, VerifyMedicalCredentialsResponse>(
        functions,
        "verifyMedicalCredentials"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to verify credentials");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { verifyCredentials, loading, error };
}

/**
 * Hook for assigning a patient to the best available care team member (doctor or caretaker)
 */
export function useAssignCareTeamMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const assignMember = async (data: AssignCareTeamMemberRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<AssignCareTeamMemberRequest, AssignCareTeamMemberResponse>(
        functions,
        "assignCareTeamMember"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to assign ${data.careTeamRole}`);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { assignMember, loading, error };
}

/**
 * Hook for updating care team member availability status (doctors and caretakers)
 */
export function useUpdateAvailability() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateAvailability = async (data: UpdateAvailabilityRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<UpdateAvailabilityRequest, UpdateAvailabilityResponse>(
        functions,
        "updateAvailability"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update availability");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { updateAvailability, loading, error };
}

/**
 * Hook for manually escalating a patient from caretaker to doctor
 */
export function useEscalateToDoctor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const escalate = async (data: EscalateToDoctorRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<EscalateToDoctorRequest, EscalateToDoctorResponse>(
        functions,
        "escalateToDoctor"
      );
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to escalate to doctor");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { escalate, loading, error };
}

/**
 * Generic hook for calling any Cloud Function
 */
export function useCallFunction<TRequest = unknown, TResponse = unknown>(functionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const call = async (data: TRequest) => {
    setLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<TRequest, TResponse>(functions, functionName);
      const result = await callable(data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to call ${functionName}`);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { call, loading, error };
}
