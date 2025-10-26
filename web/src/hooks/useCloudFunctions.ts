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
