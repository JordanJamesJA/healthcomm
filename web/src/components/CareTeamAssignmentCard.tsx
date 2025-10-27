/**
 * CareTeamAssignmentCard Component
 * Displays assigned care team members (doctors and caretakers) with transparent assignment reasoning
 * Supports patient choice between roles and manual escalation
 */

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import type { AssignmentReason, CareTeamRole } from "../contexts/AuthTypes";
import {
  useAssignCareTeamMember,
  useEscalateToDoctor,
} from "../hooks/useCloudFunctions";

interface CareTeamAssignmentCardProps {
  patientId: string;
  assignedDoctorId?: string;
  assignedCaretakerId?: string;
  assignmentReason?: AssignmentReason;
  onAssignmentComplete?: () => void;
}

export default function CareTeamAssignmentCard({
  patientId,
  assignedDoctorId,
  assignedCaretakerId,
  assignmentReason,
  onAssignmentComplete,
}: CareTeamAssignmentCardProps) {
  const [doctorData, setDoctorData] = useState<{
    firstName: string;
    lastName: string;
    specialization: string;
    yearsInPractice: string;
    hospitalAffiliation?: string;
    availability?: string;
  } | null>(null);

  const [caretakerData, setCaretakerData] = useState<{
    firstName: string;
    lastName: string;
    experienceYears: string;
    certified: boolean;
    availability?: string;
  } | null>(null);

  const [showReasoning, setShowReasoning] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CareTeamRole | "both">(
    "doctor"
  );
  const [autoEscalate, setAutoEscalate] = useState(false);
  const { assignMember, loading } = useAssignCareTeamMember();
  const { escalate, loading: escalating } = useEscalateToDoctor();

  const loadDoctorData = useCallback(async () => {
    if (!assignedDoctorId) return;

    try {
      const doctorDoc = await getDoc(doc(db, "users", assignedDoctorId));
      if (doctorDoc.exists()) {
        setDoctorData(doctorDoc.data() as typeof doctorData);
      }
    } catch (error) {
      console.error("Error loading doctor data:", error);
    }
  }, [assignedDoctorId]);

  const loadCaretakerData = useCallback(async () => {
    if (!assignedCaretakerId) return;

    try {
      const caretakerDoc = await getDoc(doc(db, "users", assignedCaretakerId));
      if (caretakerDoc.exists()) {
        setCaretakerData(caretakerDoc.data() as typeof caretakerData);
      }
    } catch (error) {
      console.error("Error loading caretaker data:", error);
    }
  }, [assignedCaretakerId]);

  useEffect(() => {
    if (assignedDoctorId) {
      loadDoctorData();
    }
    if (assignedCaretakerId) {
      loadCaretakerData();
    }
  }, [assignedDoctorId, assignedCaretakerId, loadDoctorData, loadCaretakerData]);

  const handleAssign = async () => {
    try {
      if (selectedRole === "both") {
        // Assign caretaker first, then doctor
        await assignMember({
          patientId,
          careTeamRole: "caretaker",
          autoEscalate: false,
        });
        await assignMember({
          patientId,
          careTeamRole: "doctor",
          urgency: "routine",
        });
      } else {
        await assignMember({
          patientId,
          careTeamRole: selectedRole,
          urgency: "routine",
          autoEscalate: selectedRole === "caretaker" ? autoEscalate : undefined,
        });
      }
      alert("Care team member(s) assigned successfully!");
      onAssignmentComplete?.();
    } catch (error) {
      alert("Failed to assign care team member. Please try again.");
      console.error("Error assigning care team:", error);
    }
  };

  const handleEscalate = async () => {
    if (!window.confirm("Escalate this patient to doctor care?")) return;

    try {
      const result = await escalate({ patientId });
      alert(result.message || "Successfully escalated to doctor!");
      onAssignmentComplete?.();
    } catch (error) {
      alert("Failed to escalate. Please try again.");
      console.error("Error escalating:", error);
    }
  };

  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case "available":
        return "text-green-600 bg-green-50";
      case "busy":
        return "text-yellow-600 bg-yellow-50";
      case "offline":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getAvailabilityIcon = (availability?: string) => {
    switch (availability) {
      case "available":
        return "●";
      case "busy":
        return "◐";
      case "offline":
        return "○";
      default:
        return "?";
    }
  };

  const hasDoctor = !!assignedDoctorId && !!doctorData;
  const hasCaretaker = !!assignedCaretakerId && !!caretakerData;
  const hasAnyone = hasDoctor || hasCaretaker;

  if (!hasAnyone) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Care Team</h3>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            Not Assigned
          </span>
        </div>

        <p className="text-gray-600 mb-4">
          No care team members assigned yet. Choose who you'd like to be matched
          with based on your needs.
        </p>

        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Care Team Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedRole("doctor")}
              className={`p-3 rounded-lg border-2 transition-all text-sm ${
                selectedRole === "doctor"
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold">Doctor</div>
              <div className="text-xs opacity-75">Medical specialist</div>
            </button>
            <button
              onClick={() => setSelectedRole("caretaker")}
              className={`p-3 rounded-lg border-2 transition-all text-sm ${
                selectedRole === "caretaker"
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold">Caretaker</div>
              <div className="text-xs opacity-75">Daily monitoring</div>
            </button>
            <button
              onClick={() => setSelectedRole("both")}
              className={`p-3 rounded-lg border-2 transition-all text-sm ${
                selectedRole === "both"
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold">Both</div>
              <div className="text-xs opacity-75">Full care team</div>
            </button>
          </div>
        </div>

        {/* Auto-Escalate Option for Caretaker */}
        {selectedRole === "caretaker" && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoEscalate}
                onChange={(e) => setAutoEscalate(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Enable Auto-Escalation
                </div>
                <div className="text-xs text-gray-600">
                  Automatically assign a doctor if health conditions worsen
                </div>
              </div>
            </label>
          </div>
        )}

        <button
          onClick={handleAssign}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading
            ? "Assigning..."
            : `Find Available ${
                selectedRole === "both"
                  ? "Care Team"
                  : selectedRole === "doctor"
                  ? "Doctor"
                  : "Caretaker"
              }`}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Care Team</h3>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          Assigned
        </span>
      </div>

      {/* Doctor Section */}
      {hasDoctor && (
        <div className="border-l-4 border-blue-500 pl-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold">
                Doctor
              </div>
              <h4 className="text-xl font-semibold text-gray-900">
                Dr. {doctorData.firstName} {doctorData.lastName}
              </h4>
            </div>
            {doctorData.availability && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(
                  doctorData.availability
                )}`}
              >
                {getAvailabilityIcon(doctorData.availability)}{" "}
                {doctorData.availability}
              </span>
            )}
          </div>
          <p className="text-gray-600 font-medium">
            {doctorData.specialization}
          </p>
          {doctorData.hospitalAffiliation && (
            <p className="text-sm text-gray-500">
              {doctorData.hospitalAffiliation}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {doctorData.yearsInPractice} years of experience
          </p>
        </div>
      )}

      {/* Caretaker Section */}
      {hasCaretaker && (
        <div className="border-l-4 border-green-500 pl-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold">
                Caretaker
              </div>
              <h4 className="text-xl font-semibold text-gray-900">
                {caretakerData.firstName} {caretakerData.lastName}
                {caretakerData.certified && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Certified
                  </span>
                )}
              </h4>
            </div>
            {caretakerData.availability && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(
                  caretakerData.availability
                )}`}
              >
                {getAvailabilityIcon(caretakerData.availability)}{" "}
                {caretakerData.availability}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {caretakerData.experienceYears} years of experience
          </p>
        </div>
      )}

      {/* Assignment Reasoning Toggle */}
      {assignmentReason && (
        <div className="border-t pt-4">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center justify-between w-full text-left text-gray-700 hover:text-gray-900"
          >
            <span className="font-medium">
              Why was this {assignmentReason.role} selected?
            </span>
            <svg
              className={`w-5 h-5 transition-transform ${
                showReasoning ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Reasoning Details */}
          {showReasoning && (
            <div className="mt-4 space-y-3 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Overall Match Score
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {assignmentReason.score}/
                  {assignmentReason.role === "doctor" ? "225" : "155"}
                </span>
              </div>

              <div className="border-t pt-3 space-y-2">
                <h5 className="text-sm font-semibold text-gray-700">
                  Scoring Breakdown:
                </h5>

                {/* Doctor-specific factors */}
                {assignmentReason.role === "doctor" &&
                  assignmentReason.factors.specializationMatch && (
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">✓</span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          <strong>Specialization Match</strong>
                          {assignmentReason.factors.matchedConditions &&
                            assignmentReason.factors.matchedConditions.length >
                              0 && (
                              <span className="ml-2 text-green-600">
                                (
                                {assignmentReason.factors.matchedConditions.join(
                                  ", "
                                )}
                                )
                              </span>
                            )}
                        </p>
                        <p className="text-xs text-gray-500">
                          +
                          {(assignmentReason.factors.matchedConditions
                            ?.length || 0) * 100}{" "}
                          points
                        </p>
                      </div>
                    </div>
                  )}

                {/* Caretaker-specific factors */}
                {assignmentReason.role === "caretaker" &&
                  assignmentReason.factors.certificationBonus !== undefined && (
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">
                        {assignmentReason.factors.certificationBonus > 0
                          ? "✓"
                          : "○"}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          <strong>Certified Professional</strong>
                        </p>
                        <p className="text-xs text-gray-500">
                          +{assignmentReason.factors.certificationBonus} points
                        </p>
                      </div>
                    </div>
                  )}

                {/* Availability */}
                <div className="flex items-start space-x-2">
                  <span className="text-lg">
                    {assignmentReason.factors.availabilityBonus > 0 ? "✓" : "○"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <strong>Available Status</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      +{assignmentReason.factors.availabilityBonus} points
                    </p>
                  </div>
                </div>

                {/* Workload Balance */}
                <div className="flex items-start space-x-2">
                  <span className="text-lg">⚖</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <strong>Balanced Workload</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      +{assignmentReason.factors.workloadScore} points
                    </p>
                  </div>
                </div>

                {/* Experience */}
                <div className="flex items-start space-x-2">
                  <span className="text-lg">★</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <strong>Experience Level</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      +{assignmentReason.factors.experienceScore} points
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500">
                  Assigned by: <strong>{assignmentReason.assignedBy}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-2 pt-4 border-t">
        {/* Escalate Button (only if caretaker but no doctor) */}
        {hasCaretaker && !hasDoctor && (
          <button
            onClick={handleEscalate}
            disabled={escalating}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            {escalating ? "Escalating..." : "⚡ Escalate to Doctor"}
          </button>
        )}

        {/* Request Different Member */}
        <button
          onClick={handleAssign}
          disabled={loading}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
        >
          {loading ? "Reassigning..." : "Request Different Care Team Member"}
        </button>
      </div>
    </div>
  );
}
