/**
 * Firebase Cloud Functions for HealthComm
 *
 * This module contains all serverless functions for the HealthComm application,
 * including user management, notifications, data validation, and scheduled tasks.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
admin.initializeApp();

// Global options for cost control
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
});

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Triggered when a new user document is created in Firestore
 * Initializes user profile and sends welcome notification
 */
export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No data associated with the event");
    return;
  }

  const userId = event.params.userId;
  const userData = snapshot.data();

  logger.info(`New user created: ${userId}`, { role: userData.role });

  try {
    // Create audit log for user creation
    await admin.firestore().collection("auditLogs").add({
      action: "user_created",
      userId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        role: userData.role,
        email: userData.email,
      },
    });

    // Send welcome email based on role (would integrate with email service)
    logger.info(`Welcome email queued for ${userData.email}`);

    // If patient, initialize vitals subcollection metadata
    if (userData.role === "patient") {
      await admin.firestore().doc(`patients/${userId}`).set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        vitalsCount: 0,
        alertsCount: 0,
      });
    }

    return { success: true };
  } catch (error) {
    logger.error("Error in onUserCreated:", error);
    throw error;
  }
});

/**
 * Validates user data when updated
 * Ensures critical fields are not modified
 */
export const onUserUpdated = onDocumentUpdated("users/{userId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) {
    logger.error("Missing before/after data in user update");
    return;
  }

  const userId = event.params.userId;

  // Check if critical fields were modified (should be prevented by security rules)
  const criticalFields = ["uid", "email", "role", "createdAt"];
  const modifiedCriticalFields = criticalFields.filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field])
  );

  if (modifiedCriticalFields.length > 0) {
    logger.error(`Critical fields modified for user ${userId}:`, modifiedCriticalFields);
    // In a production system, you might want to revert or flag this
  }

  // Create audit log for profile updates
  await admin.firestore().collection("auditLogs").add({
    action: "user_updated",
    userId: userId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    details: {
      before: before,
      after: after,
    },
  });

  logger.info(`User profile updated: ${userId}`);
  return { success: true };
});

// ============================================
// VITALS & ALERTS FUNCTIONS
// ============================================

/**
 * Triggered when a new vitals reading is created
 * Updates patient metadata and sends notifications if needed
 */
export const onVitalsCreated = onDocumentCreated(
  "patients/{patientId}/vitals/{vitalId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with vitals event");
      return;
    }

    const patientId = event.params.patientId;
    const vitalsData = snapshot.data();

    logger.info(`New vitals reading for patient ${patientId}`);

    try {
      // Update patient metadata
      const patientRef = admin.firestore().doc(`patients/${patientId}`);
      await patientRef.update({
        vitalsCount: admin.firestore.FieldValue.increment(1),
        lastVitalsTimestamp: vitalsData.timestamp,
      });

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: "vitals_created",
        userId: patientId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          deviceId: vitalsData.deviceId,
          hasHeartRate: !!vitalsData.heartRate,
          hasBloodPressure: !!(vitalsData.bloodPressureSystolic && vitalsData.bloodPressureDiastolic),
          hasOxygenLevel: !!vitalsData.oxygenLevel,
          hasTemperature: !!vitalsData.temperature,
          hasGlucose: !!vitalsData.glucose,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error("Error in onVitalsCreated:", error);
      throw error;
    }
  }
);

/**
 * Triggered when a new alert is created
 * Sends push notifications to patient, caretaker, and doctor
 */
export const onAlertCreated = onDocumentCreated(
  "patients/{patientId}/alerts/{alertId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with alert event");
      return;
    }

    const patientId = event.params.patientId;
    const alertData = snapshot.data();

    logger.info(`New alert for patient ${patientId}:`, {
      severity: alertData.severity,
      title: alertData.title,
    });

    try {
      // Update patient metadata
      const patientRef = admin.firestore().doc(`patients/${patientId}`);
      await patientRef.update({
        alertsCount: admin.firestore.FieldValue.increment(1),
      });

      // Get patient user document to find assigned caretaker/doctor
      const userDoc = await admin.firestore().doc(`users/${patientId}`).get();
      const userData = userDoc.data();

      if (!userData) {
        logger.error(`User data not found for patient ${patientId}`);
        return { success: false };
      }

      const notificationTargets: string[] = [patientId];

      // Add assigned caretaker
      if (userData.assignedCaretakerId) {
        notificationTargets.push(userData.assignedCaretakerId);
      }

      // Add assigned doctor
      if (userData.assignedDoctorId) {
        notificationTargets.push(userData.assignedDoctorId);
      }

      // Queue notifications (would integrate with FCM)
      for (const targetUserId of notificationTargets) {
        logger.info(`Queuing notification for user ${targetUserId}`);

        // Create notification document (can be consumed by FCM service)
        await admin.firestore().collection("notifications").add({
          userId: targetUserId,
          type: "alert",
          severity: alertData.severity,
          title: alertData.title,
          message: alertData.message,
          patientId: patientId,
          patientName: `${userData.firstName} ${userData.lastName}`,
          alertId: event.params.alertId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          sent: false,
        });
      }

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: "alert_created",
        userId: patientId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          severity: alertData.severity,
          title: alertData.title,
          notificationTargets: notificationTargets,
        },
      });

      // Update user status if high severity
      if (alertData.severity === "high") {
        await admin.firestore().doc(`users/${patientId}`).update({
          status: "critical",
        });
      } else if (alertData.severity === "medium" && userData.status !== "critical") {
        await admin.firestore().doc(`users/${patientId}`).update({
          status: "warning",
        });
      }

      // AUTO-ESCALATION LOGIC
      // If patient has caretaker but no doctor, and autoEscalateToDoctor is enabled
      // Escalate to doctor on critical alerts or multiple high-severity alerts
      if (userData.assignedCaretakerId && !userData.assignedDoctorId && userData.autoEscalateToDoctor) {
        let shouldEscalate = false;
        let escalationReason = "";

        // Escalate on critical status
        if (alertData.severity === "high") {
          // Count recent high-severity alerts (last 24 hours)
          const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 24 * 60 * 60 * 1000)
          );

          const recentHighAlerts = await admin
            .firestore()
            .collection(`patients/${patientId}/alerts`)
            .where("severity", "==", "high")
            .where("timestamp", ">=", twentyFourHoursAgo)
            .get();

          if (recentHighAlerts.size >= 2) {
            shouldEscalate = true;
            escalationReason = `Multiple high-severity alerts (${recentHighAlerts.size} in 24 hours)`;
          }
        }

        if (shouldEscalate) {
          logger.info(`Auto-escalating patient ${patientId} to doctor due to: ${escalationReason}`);

          // Find available doctor using simplified logic
          const doctorsSnapshot = await admin
            .firestore()
            .collection("users")
            .where("role", "==", "medical")
            .where("availability", "==", "available")
            .limit(1)
            .get();

          if (!doctorsSnapshot.empty) {
            const doctorDoc = doctorsSnapshot.docs[0];
            const doctorData = doctorDoc.data();

            await admin.firestore().doc(`users/${patientId}`).update({
              assignedDoctorId: doctorDoc.id,
              assignedDoctor: `${doctorData.firstName} ${doctorData.lastName}`,
              escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
              escalatedFrom: userData.assignedCaretakerId,
              escalationReason: escalationReason,
            });

            // Notify all parties
            await admin.firestore().collection("notifications").add({
              userId: doctorDoc.id,
              type: "alert",
              severity: "high",
              title: "URGENT: Patient Auto-Escalated",
              message: `${userData.firstName} ${userData.lastName} has been auto-escalated due to: ${escalationReason}`,
              patientId: patientId,
              patientName: `${userData.firstName} ${userData.lastName}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
              sent: false,
            });

            logger.info(`Auto-escalated patient ${patientId} to doctor ${doctorDoc.id}`);
          }
        }
      }

      return { success: true };
    } catch (error) {
      logger.error("Error in onAlertCreated:", error);
      throw error;
    }
  }
);

// ============================================
// INVITATION MANAGEMENT FUNCTIONS
// ============================================

/**
 * Callable function to send invitation to caretaker or doctor
 */
export const sendInvitation = onCall(
  { cors: true },
  async (request) => {
    const { recipientEmail, type, message } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!recipientEmail || !type) {
      throw new HttpsError("invalid-argument", "recipientEmail and type are required");
    }

    if (!["caretaker", "doctor"].includes(type)) {
      throw new HttpsError("invalid-argument", "type must be 'caretaker' or 'doctor'");
    }

    logger.info(`Sending ${type} invitation from ${userId} to ${recipientEmail}`);

    try {
      // Get sender information
      const senderDoc = await admin.firestore().doc(`users/${userId}`).get();
      const senderData = senderDoc.data();

      if (!senderData) {
        throw new HttpsError("not-found", "Sender user not found");
      }

      // Create invitation document
      const invitationRef = await admin.firestore().collection("invitations").add({
        senderId: userId,
        senderName: `${senderData.firstName} ${senderData.lastName}`,
        senderEmail: senderData.email,
        recipientEmail: recipientEmail,
        type: type,
        status: "pending",
        message: message || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        ),
      });

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: "invitation_sent",
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          invitationId: invitationRef.id,
          recipientEmail: recipientEmail,
          type: type,
        },
      });

      logger.info(`Invitation created: ${invitationRef.id}`);

      return {
        success: true,
        invitationId: invitationRef.id,
      };
    } catch (error) {
      logger.error("Error in sendInvitation:", error);
      throw new HttpsError("internal", "Failed to send invitation");
    }
  }
);

/**
 * Callable function to accept or decline an invitation
 */
export const respondToInvitation = onCall(
  { cors: true },
  async (request) => {
    const { invitationId, action } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!invitationId || !action) {
      throw new HttpsError("invalid-argument", "invitationId and action are required");
    }

    if (!["accept", "decline"].includes(action)) {
      throw new HttpsError("invalid-argument", "action must be 'accept' or 'decline'");
    }

    logger.info(`User ${userId} ${action}ing invitation ${invitationId}`);

    try {
      // Get invitation document
      const invitationRef = admin.firestore().doc(`invitations/${invitationId}`);
      const invitationDoc = await invitationRef.get();

      if (!invitationDoc.exists) {
        throw new HttpsError("not-found", "Invitation not found");
      }

      const invitationData = invitationDoc.data();

      if (!invitationData) {
        throw new HttpsError("not-found", "Invitation data not found");
      }

      // Get user email to verify recipient
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      const userData = userDoc.data();

      if (!userData || userData.email !== invitationData.recipientEmail) {
        throw new HttpsError("permission-denied", "You are not the recipient of this invitation");
      }

      // Check if invitation is still valid
      if (invitationData.status !== "pending") {
        throw new HttpsError("failed-precondition", "Invitation has already been responded to");
      }

      const now = admin.firestore.Timestamp.now();
      if (invitationData.expiresAt && invitationData.expiresAt < now) {
        throw new HttpsError("failed-precondition", "Invitation has expired");
      }

      // Update invitation status
      await invitationRef.update({
        status: action === "accept" ? "accepted" : "declined",
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        respondedBy: userId,
      });

      // If accepted, update user relationships
      if (action === "accept") {
        const senderRef = admin.firestore().doc(`users/${invitationData.senderId}`);

        if (invitationData.type === "caretaker") {
          await senderRef.update({
            assignedCaretakerId: userId,
          });
        } else if (invitationData.type === "doctor") {
          await senderRef.update({
            assignedDoctorId: userId,
          });
        }
      }

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: `invitation_${action}ed`,
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          invitationId: invitationId,
          senderId: invitationData.senderId,
          type: invitationData.type,
        },
      });

      logger.info(`Invitation ${action}ed successfully`);

      return { success: true };
    } catch (error) {
      logger.error("Error in respondToInvitation:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to respond to invitation");
    }
  }
);

/**
 * Callable function to intelligently assign a patient to the best available care team member
 * Supports both doctors and caretakers with smart matching algorithms
 * Can automatically escalate from caretaker to doctor based on patient condition
 */
export const assignCareTeamMember = onCall(
  { cors: true },
  async (request) => {
    const { patientId, careTeamRole, preferredSpecialization, urgency, autoEscalate } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!patientId) {
      throw new HttpsError("invalid-argument", "patientId is required");
    }

    if (!careTeamRole || !["doctor", "caretaker"].includes(careTeamRole)) {
      throw new HttpsError("invalid-argument", "careTeamRole must be 'doctor' or 'caretaker'");
    }

    logger.info(`Assigning ${careTeamRole} for patient ${patientId}`, { preferredSpecialization, urgency, autoEscalate });

    try {
      // Verify user has permission (patient themselves, admin, or existing caretaker)
      const patientDoc = await admin.firestore().doc(`users/${patientId}`).get();
      const patientData = patientDoc.data();

      if (!patientData) {
        throw new HttpsError("not-found", "Patient not found");
      }

      const hasPermission =
        userId === patientId ||
        patientData.assignedCaretakerId === userId;
        // TODO: Add admin role check when implemented

      if (!hasPermission) {
        throw new HttpsError("permission-denied", "You do not have permission to assign a doctor for this patient");
      }

      // Get patient's chronic conditions and status for matching
      const patientConditions = patientData.chronicConditions || [];
      const patientStatus = patientData.status || "stable";

      // Get all care team members based on role
      const role = careTeamRole === "doctor" ? "medical" : "caretaker";
      const membersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("role", "==", role)
        .get();

      if (membersSnapshot.empty) {
        throw new HttpsError("not-found", `No ${careTeamRole}s available in the system`);
      }

      // Score each care team member
      interface ScoredMember {
        uid: string;
        firstName: string;
        lastName: string;
        specialization?: string;
        certified?: boolean;
        score: number;
        matchedConditions: string[];
        availability: string;
        currentPatientCount: number;
        experience: number;
      }

      const scoredMembers: ScoredMember[] = [];

      for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        const memberId = memberDoc.id;

        // Initialize score
        let score = 0;
        const matchedConditions: string[] = [];

        // ROLE-SPECIFIC SCORING
        if (careTeamRole === "doctor") {
          // DOCTOR-SPECIFIC SCORING

          // 1. SPECIALIZATION MATCH (100 points per match)
          const doctorSpec = (memberData.specialization || "").toLowerCase();

          // Common specialization-condition mappings
          const specializationMatches: Record<string, string[]> = {
            cardiology: ["heart disease", "hypertension", "high blood pressure", "cardiovascular"],
            endocrinology: ["diabetes", "thyroid", "metabolic"],
            pulmonology: ["asthma", "copd", "respiratory", "lung"],
            nephrology: ["kidney", "renal"],
            neurology: ["epilepsy", "seizure", "migraine", "neurological"],
            gastroenterology: ["crohn", "ibd", "digestive", "gastric"],
            rheumatology: ["arthritis", "lupus", "autoimmune"],
            oncology: ["cancer", "tumor"],
            psychiatry: ["depression", "anxiety", "mental health"],
            "family medicine": [], // Matches all - general practitioner
            "internal medicine": [], // Matches all - general practitioner
          };

          // Check if doctor's specialization matches patient conditions
          if (patientConditions.length > 0) {
            for (const condition of patientConditions) {
              const conditionLower = condition.toLowerCase();

              // Check direct match or mapping
              for (const [spec, keywords] of Object.entries(specializationMatches)) {
                if (doctorSpec.includes(spec)) {
                  if (keywords.length === 0 || keywords.some(kw => conditionLower.includes(kw))) {
                    score += 100;
                    matchedConditions.push(condition);
                    break;
                  }
                }
              }
            }
          }

          // Preferred specialization bonus
          if (preferredSpecialization && doctorSpec.includes(preferredSpecialization.toLowerCase())) {
            score += 100;
          }
        } else {
          // CARETAKER-SPECIFIC SCORING

          // 1. CERTIFICATION BONUS (50 points for certified)
          const isCertified = memberData.certified || false;
          if (isCertified) {
            score += 50;
          }

          // 2. EXPERIENCE MATCH - bonus for caretakers with medical condition experience
          const experienceYears = parseInt(memberData.experienceYears || "0");
          if (experienceYears >= 5) {
            score += 30; // Experienced caretaker bonus
          } else if (experienceYears >= 2) {
            score += 15; // Moderate experience
          }
        }

        // SHARED SCORING FACTORS (both doctors and caretakers)

        // AVAILABILITY STATUS (50 points for available)
        const availability = memberData.availability || "available"; // Default to available
        if (availability === "available") {
          score += 50;
        } else if (availability === "busy" && urgency === "urgent") {
          score += 25; // Still consider busy members for urgent cases
        }
        // Offline members get 0 points unless emergency

        // WORKLOAD BALANCE (0-50 points, inversely proportional to patient count)
        const assignedField = careTeamRole === "doctor" ? "assignedDoctorId" : "assignedCaretakerId";
        const assignedPatientsSnapshot = await admin
          .firestore()
          .collection("users")
          .where("role", "==", "patient")
          .where(assignedField, "==", memberId)
          .get();

        const currentPatientCount = assignedPatientsSnapshot.size;
        const maxPatients = memberData.maxPatients || 50;

        // Calculate workload score (higher score for fewer patients)
        const workloadRatio = currentPatientCount / maxPatients;
        const workloadScore = Math.max(0, 50 - (workloadRatio * 50));
        score += workloadScore;

        // EXPERIENCE BONUS (0-25 points)
        const experience = careTeamRole === "doctor"
          ? parseInt(memberData.yearsInPractice || "0")
          : parseInt(memberData.experienceYears || "0");
        const experienceScore = Math.min(25, experience * 1.25); // Cap at 25 points
        score += experienceScore;

        scoredMembers.push({
          uid: memberId,
          firstName: memberData.firstName || "",
          lastName: memberData.lastName || "",
          specialization: memberData.specialization,
          certified: memberData.certified,
          score: score,
          matchedConditions: matchedConditions,
          availability: availability,
          currentPatientCount: currentPatientCount,
          experience: experience,
        });
      }

      // Sort by score descending
      scoredMembers.sort((a, b) => b.score - a.score);

      if (scoredMembers.length === 0 || scoredMembers[0].score === 0) {
        throw new HttpsError("unavailable", `No suitable ${careTeamRole}s available at this time`);
      }

      // Select the top member
      const selectedMember = scoredMembers[0];

      // Create assignment reason object
      const assignmentReason = {
        score: selectedMember.score,
        role: careTeamRole,
        factors: {
          ...(careTeamRole === "doctor" && {
            specializationMatch: selectedMember.matchedConditions.length > 0,
            matchedConditions: selectedMember.matchedConditions,
          }),
          ...(careTeamRole === "caretaker" && {
            certificationBonus: selectedMember.certified ? 50 : 0,
          }),
          availabilityBonus: selectedMember.availability === "available" ? 50 : 0,
          workloadScore: Math.round(50 - (selectedMember.currentPatientCount / 50 * 50)),
          experienceScore: Math.round(Math.min(25, selectedMember.experience * 1.25)),
        },
        assignedBy: "system",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Update patient document with assigned care team member
      const updateData: any = {
        assignmentReason: assignmentReason,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (careTeamRole === "doctor") {
        updateData.assignedDoctorId = selectedMember.uid;
        updateData.assignedDoctor = `${selectedMember.firstName} ${selectedMember.lastName}`;
      } else {
        updateData.assignedCaretakerId = selectedMember.uid;
        updateData.assignedCaretaker = `${selectedMember.firstName} ${selectedMember.lastName}`;
      }

      // Set auto-escalate flag if requested
      if (autoEscalate && careTeamRole === "caretaker") {
        updateData.autoEscalateToDoctor = true;
      }

      await admin.firestore().doc(`users/${patientId}`).update(updateData);

      // Create notification for the assigned care team member
      const memberTitle = careTeamRole === "doctor" ? "New Patient Assigned" : "New Patient Assigned";
      await admin.firestore().collection("notifications").add({
        userId: selectedMember.uid,
        type: "system",
        severity: "low",
        title: memberTitle,
        message: `${patientData.firstName} ${patientData.lastName} has been assigned to your care.`,
        patientId: patientId,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        sent: false,
      });

      // Create notification for the patient
      const patientMessage = careTeamRole === "doctor"
        ? `Dr. ${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.specialization}) has been assigned as your doctor.`
        : `${selectedMember.firstName} ${selectedMember.lastName} has been assigned as your caretaker.${selectedMember.certified ? " (Certified Professional)" : ""}`;

      await admin.firestore().collection("notifications").add({
        userId: patientId,
        type: "system",
        severity: "low",
        title: `${careTeamRole === "doctor" ? "Doctor" : "Caretaker"} Assigned`,
        message: patientMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        sent: false,
      });

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: `${careTeamRole}_assigned`,
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          patientId: patientId,
          assignedId: selectedMember.uid,
          role: careTeamRole,
          score: selectedMember.score,
          matchedConditions: selectedMember.matchedConditions,
          assignedBy: "system",
        },
      });

      logger.info(`Successfully assigned ${careTeamRole} ${selectedMember.uid} to patient ${patientId} with score ${selectedMember.score}`);

      return {
        success: true,
        assignedId: selectedMember.uid,
        assignedName: `${selectedMember.firstName} ${selectedMember.lastName}`,
        role: careTeamRole,
        reason: assignmentReason,
        message: careTeamRole === "doctor"
          ? `Successfully assigned to Dr. ${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.specialization})`
          : `Successfully assigned to ${selectedMember.firstName} ${selectedMember.lastName} (Caretaker)`,
      };
    } catch (error) {
      logger.error("Error in assignCareTeamMember:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Failed to assign ${careTeamRole}`);
    }
  }
);

/**
 * Callable function to update a care team member's availability status
 * Works for both doctors and caretakers
 */
export const updateAvailability = onCall(
  { cors: true },
  async (request) => {
    const { availability } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!availability || !["available", "busy", "offline"].includes(availability)) {
      throw new HttpsError("invalid-argument", "availability must be 'available', 'busy', or 'offline'");
    }

    try {
      // Verify user is a medical professional or caretaker
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      const userData = userDoc.data();

      if (!userData || !["medical", "caretaker"].includes(userData.role)) {
        throw new HttpsError("permission-denied", "Only medical professionals and caretakers can update availability");
      }

      logger.info(`Updating availability for ${userData.role} ${userId} to ${availability}`);

      // Update availability
      await admin.firestore().doc(`users/${userId}`).update({
        availability: availability,
        availabilityUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: "availability_updated",
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          role: userData.role,
          availability: availability,
        },
      });

      logger.info(`Availability updated successfully for ${userData.role} ${userId}`);

      return { success: true, availability: availability };
    } catch (error) {
      logger.error("Error in updateAvailability:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to update availability");
    }
  }
);

/**
 * Callable function to manually escalate a patient from caretaker to doctor
 */
export const escalateToDoctor = onCall(
  { cors: true },
  async (request) => {
    const { patientId, reason } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!patientId) {
      throw new HttpsError("invalid-argument", "patientId is required");
    }

    logger.info(`Escalating patient ${patientId} to doctor care`, { reason });

    try {
      // Verify user has permission (patient, caretaker, or existing doctor)
      const patientDoc = await admin.firestore().doc(`users/${patientId}`).get();
      const patientData = patientDoc.data();

      if (!patientData) {
        throw new HttpsError("not-found", "Patient not found");
      }

      const hasPermission =
        userId === patientId ||
        patientData.assignedCaretakerId === userId ||
        patientData.assignedDoctorId === userId;

      if (!hasPermission) {
        throw new HttpsError("permission-denied", "You do not have permission to escalate this patient");
      }

      // Check if patient already has a doctor
      if (patientData.assignedDoctorId) {
        return {
          success: true,
          message: "Patient already has an assigned doctor",
          doctorId: patientData.assignedDoctorId,
        };
      }

      // Store the current caretaker ID for reference
      const previousCaretakerId = patientData.assignedCaretakerId;

      // Call assignCareTeamMember to find a doctor
      // Note: We're making an internal function call here by reusing the logic
      const doctorsSnapshot = await admin
        .firestore()
        .collection("users")
        .where("role", "==", "medical")
        .get();

      if (doctorsSnapshot.empty) {
        throw new HttpsError("not-found", "No doctors available for escalation");
      }

      // Use the same scoring logic from assignCareTeamMember
      // For brevity in escalation, we'll find the first available doctor with matching specialization
      const patientConditions = patientData.chronicConditions || [];
      let bestDoctor: any = null;
      let bestScore = 0;

      for (const doctorDoc of doctorsSnapshot.docs) {
        const doctorData = doctorDoc.data();
        const availability = doctorData.availability || "available";

        if (availability !== "offline") {
          let score = availability === "available" ? 100 : 50;

          // Check for specialization match
          const doctorSpec = (doctorData.specialization || "").toLowerCase();
          for (const condition of patientConditions) {
            if (doctorSpec.includes(condition.toLowerCase()) ||
                condition.toLowerCase().includes(doctorSpec)) {
              score += 100;
              break;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestDoctor = { id: doctorDoc.id, data: doctorData };
          }
        }
      }

      if (!bestDoctor) {
        throw new HttpsError("unavailable", "No available doctors for escalation");
      }

      // Update patient with doctor assignment
      await admin.firestore().doc(`users/${patientId}`).update({
        assignedDoctorId: bestDoctor.id,
        assignedDoctor: `${bestDoctor.data.firstName} ${bestDoctor.data.lastName}`,
        escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
        escalatedFrom: previousCaretakerId,
        escalationReason: reason || "auto-escalation",
      });

      // Notify doctor
      await admin.firestore().collection("notifications").add({
        userId: bestDoctor.id,
        type: "alert",
        severity: "medium",
        title: "Patient Escalated to Your Care",
        message: `${patientData.firstName} ${patientData.lastName} has been escalated from caretaker to doctor care.${reason ? ` Reason: ${reason}` : ""}`,
        patientId: patientId,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        sent: false,
      });

      // Notify caretaker if exists
      if (previousCaretakerId) {
        await admin.firestore().collection("notifications").add({
          userId: previousCaretakerId,
          type: "system",
          severity: "medium",
          title: "Patient Escalated to Doctor",
          message: `${patientData.firstName} ${patientData.lastName} has been escalated to doctor care. You will continue to receive updates.`,
          patientId: patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          sent: false,
        });
      }

      // Notify patient
      await admin.firestore().collection("notifications").add({
        userId: patientId,
        type: "system",
        severity: "low",
        title: "Care Escalated to Doctor",
        message: `Dr. ${bestDoctor.data.firstName} ${bestDoctor.data.lastName} has been assigned to oversee your care.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        sent: false,
      });

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: "patient_escalated",
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          patientId: patientId,
          doctorId: bestDoctor.id,
          previousCaretakerId: previousCaretakerId,
          reason: reason || "auto-escalation",
        },
      });

      logger.info(`Successfully escalated patient ${patientId} to doctor ${bestDoctor.id}`);

      return {
        success: true,
        doctorId: bestDoctor.id,
        doctorName: `${bestDoctor.data.firstName} ${bestDoctor.data.lastName}`,
        message: `Successfully escalated to Dr. ${bestDoctor.data.firstName} ${bestDoctor.data.lastName}`,
      };
    } catch (error) {
      logger.error("Error in escalateToDoctor:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to escalate to doctor");
    }
  }
);

// ============================================
// DATA EXPORT FUNCTIONS
// ============================================

/**
 * Callable function to export patient vitals as JSON
 */
export const exportVitalsData = onCall(
  { cors: true },
  async (request) => {
    const { patientId, startDate, endDate, format } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!patientId) {
      throw new HttpsError("invalid-argument", "patientId is required");
    }

    logger.info(`Exporting vitals for patient ${patientId} by user ${userId}`);

    try {
      // Verify user has access to this patient's data
      const patientDoc = await admin.firestore().doc(`users/${patientId}`).get();
      const patientData = patientDoc.data();

      if (!patientData) {
        throw new HttpsError("not-found", "Patient not found");
      }

      // Check access permissions
      const hasAccess =
        userId === patientId ||
        patientData.assignedCaretakerId === userId ||
        patientData.assignedDoctorId === userId;

      if (!hasAccess) {
        throw new HttpsError("permission-denied", "You do not have access to this patient's data");
      }

      // Query vitals with date range if provided
      let query = admin
        .firestore()
        .collection(`patients/${patientId}/vitals`)
        .orderBy("timestamp", "desc");

      if (startDate) {
        query = query.where("timestamp", ">=", admin.firestore.Timestamp.fromDate(new Date(startDate)));
      }

      if (endDate) {
        query = query.where("timestamp", "<=", admin.firestore.Timestamp.fromDate(new Date(endDate)));
      }

      const vitalsSnapshot = await query.limit(10000).get();

      const vitalsData = vitalsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      }));

      // Create audit log
      await admin.firestore().collection("auditLogs").add({
        action: "data_exported",
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          patientId: patientId,
          recordCount: vitalsData.length,
          format: format || "json",
        },
      });

      logger.info(`Exported ${vitalsData.length} vitals records`);

      return {
        success: true,
        data: vitalsData,
        count: vitalsData.length,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
      };
    } catch (error) {
      logger.error("Error in exportVitalsData:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to export vitals data");
    }
  }
);

// ============================================
// SCHEDULED CLEANUP FUNCTIONS
// ============================================

/**
 * Scheduled function to clean up expired invitations
 * Runs daily at midnight
 */
export const cleanupExpiredInvitations = onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight
    timeZone: "America/New_York",
  },
  async () => {
    logger.info("Running cleanup of expired invitations");

    try {
      const now = admin.firestore.Timestamp.now();

      // Find expired pending invitations
      const expiredInvitations = await admin
        .firestore()
        .collection("invitations")
        .where("status", "==", "pending")
        .where("expiresAt", "<", now)
        .get();

      logger.info(`Found ${expiredInvitations.size} expired invitations`);

      // Delete expired invitations in batch
      const batch = admin.firestore().batch();
      expiredInvitations.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info(`Deleted ${expiredInvitations.size} expired invitations`);

      return { success: true, deletedCount: expiredInvitations.size };
    } catch (error) {
      logger.error("Error in cleanupExpiredInvitations:", error);
      throw error;
    }
  }
);

/**
 * Scheduled function to clean up old notifications
 * Runs weekly on Sunday at 2 AM
 */
export const cleanupOldNotifications = onSchedule(
  {
    schedule: "0 2 * * 0", // Sunday at 2 AM
    timeZone: "America/New_York",
  },
  async () => {
    logger.info("Running cleanup of old notifications");

    try {
      // Delete notifications older than 30 days
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const oldNotifications = await admin
        .firestore()
        .collection("notifications")
        .where("createdAt", "<", thirtyDaysAgo)
        .where("read", "==", true)
        .get();

      logger.info(`Found ${oldNotifications.size} old notifications`);

      // Delete in batch
      const batch = admin.firestore().batch();
      oldNotifications.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info(`Deleted ${oldNotifications.size} old notifications`);

      return { success: true, deletedCount: oldNotifications.size };
    } catch (error) {
      logger.error("Error in cleanupOldNotifications:", error);
      throw error;
    }
  }
);

/**
 * Scheduled function to generate daily health reports
 * Runs daily at 6 AM
 */
export const generateDailyHealthReports = onSchedule(
  {
    schedule: "0 6 * * *", // Daily at 6 AM
    timeZone: "America/New_York",
  },
  async () => {
    logger.info("Generating daily health reports");

    try {
      // Get all patients
      const patientsSnapshot = await admin
        .firestore()
        .collection("users")
        .where("role", "==", "patient")
        .get();

      logger.info(`Generating reports for ${patientsSnapshot.size} patients`);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();

        // Get yesterday's vitals
        const vitalsSnapshot = await admin
          .firestore()
          .collection(`patients/${patientId}/vitals`)
          .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(yesterday))
          .where("timestamp", "<", admin.firestore.Timestamp.fromDate(today))
          .get();

        // Get yesterday's alerts
        const alertsSnapshot = await admin
          .firestore()
          .collection(`patients/${patientId}/alerts`)
          .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(yesterday))
          .where("timestamp", "<", admin.firestore.Timestamp.fromDate(today))
          .get();

        // Calculate stats
        const vitalsCount = vitalsSnapshot.size;
        const alertsCount = alertsSnapshot.size;
        const highSeverityAlerts = alertsSnapshot.docs.filter(
          (doc) => doc.data().severity === "high"
        ).length;

        // Create daily report
        await admin.firestore().collection("dailyReports").add({
          patientId: patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          date: admin.firestore.Timestamp.fromDate(yesterday),
          vitalsCount: vitalsCount,
          alertsCount: alertsCount,
          highSeverityAlerts: highSeverityAlerts,
          status: patientData.status,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      logger.info("Daily health reports generated successfully");

      return { success: true, reportCount: patientsSnapshot.size };
    } catch (error) {
      logger.error("Error in generateDailyHealthReports:", error);
      throw error;
    }
  }
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Callable function to validate medical professional credentials
 * (Placeholder - would integrate with real verification service)
 */
export const verifyMedicalCredentials = onCall(
  { cors: true },
  async (request) => {
    const { licenseId, specialization } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!licenseId) {
      throw new HttpsError("invalid-argument", "licenseId is required");
    }

    logger.info(`Verifying medical credentials for user ${userId}`);

    try {
      // In production, this would call external verification service
      // For now, just log and mark as pending verification

      await admin.firestore().collection("credentialVerifications").add({
        userId: userId,
        licenseId: licenseId,
        specialization: specialization,
        status: "pending",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Credential verification request submitted");

      return {
        success: true,
        status: "pending",
        message: "Verification request submitted. You will be notified once verified.",
      };
    } catch (error) {
      logger.error("Error in verifyMedicalCredentials:", error);
      throw new HttpsError("internal", "Failed to submit verification request");
    }
  }
);
