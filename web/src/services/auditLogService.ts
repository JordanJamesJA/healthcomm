/**
 * Audit Logging Service
 *
 * Logs user actions and data access for compliance and security monitoring
 */

import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";

export interface AuditLogEntry {
  action: string;
  userId: string;
  timestamp: Date | ReturnType<typeof serverTimestamp>;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.warn("Cannot log audit event: No authenticated user");
      return;
    }

    const auditEntry: AuditLogEntry = {
      action,
      userId: user.uid,
      timestamp: serverTimestamp(),
      details: {
        ...details,
        userEmail: user.email,
      },
      userAgent: navigator.userAgent,
    };

    await addDoc(collection(db, "auditLogs"), auditEntry);
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit logging should never break the app
  }
}

/**
 * Get audit logs for the current user
 */
export async function getUserAuditLogs(userId: string, maxResults: number = 100) {
  try {
    const q = query(
      collection(db, "auditLogs"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    throw error;
  }
}

// Predefined audit actions for consistency
export const AuditActions = {
  // Authentication actions
  USER_LOGIN: "user_login",
  USER_LOGOUT: "user_logout",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",
  EMAIL_VERIFIED: "email_verified",

  // Device actions
  DEVICE_CONNECTED: "device_connected",
  DEVICE_DISCONNECTED: "device_disconnected",
  DEVICE_SYNC_STARTED: "device_sync_started",
  DEVICE_SYNC_COMPLETED: "device_sync_completed",
  DEVICE_SYNC_FAILED: "device_sync_failed",

  // Data access actions
  VITALS_VIEWED: "vitals_viewed",
  VITALS_EXPORTED: "vitals_exported",
  PATIENT_PROFILE_VIEWED: "patient_profile_viewed",
  PATIENT_PROFILE_UPDATED: "patient_profile_updated",

  // Alert actions
  ALERT_CREATED: "alert_created",
  ALERT_VIEWED: "alert_viewed",
  ALERT_DISMISSED: "alert_dismissed",

  // Invitation actions
  INVITATION_SENT: "invitation_sent",
  INVITATION_ACCEPTED: "invitation_accepted",
  INVITATION_DECLINED: "invitation_declined",
  INVITATION_REVOKED: "invitation_revoked",

  // Settings actions
  SETTINGS_UPDATED: "settings_updated",
  NOTIFICATION_PREFERENCES_UPDATED: "notification_preferences_updated",

  // Medical professional actions
  MEDICAL_NOTE_CREATED: "medical_note_created",
  MEDICAL_NOTE_UPDATED: "medical_note_updated",
  PRESCRIPTION_CREATED: "prescription_created",

  // System actions
  ERROR_OCCURRED: "error_occurred",
  UNAUTHORIZED_ACCESS_ATTEMPT: "unauthorized_access_attempt",
} as const;

/**
 * Helper function to log device actions
 */
export function logDeviceAction(action: string, deviceId: string, deviceType: string) {
  return logAuditEvent(action, {
    deviceId,
    deviceType,
  });
}

/**
 * Helper function to log data access
 */
export function logDataAccess(action: string, dataType: string, resourceId?: string) {
  return logAuditEvent(action, {
    dataType,
    resourceId,
  });
}

/**
 * Helper function to log errors
 */
export function logError(errorMessage: string, errorDetails?: unknown) {
  return logAuditEvent(AuditActions.ERROR_OCCURRED, {
    errorMessage,
    errorDetails: errorDetails instanceof Error ? {
      name: errorDetails.name,
      message: errorDetails.message,
      stack: errorDetails.stack,
    } : errorDetails,
  });
}
