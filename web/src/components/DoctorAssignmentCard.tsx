/**
 * DoctorAssignmentCard Component
 * Displays assigned doctor information with transparent assignment reasoning
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { AssignmentReason } from "../contexts/AuthTypes";
import { useAssignPatientToDoctor } from "../hooks/useCloudFunctions";

interface DoctorAssignmentCardProps {
  patientId: string;
  assignedDoctorId?: string;
  assignmentReason?: AssignmentReason;
  onAssignmentComplete?: () => void;
}

export default function DoctorAssignmentCard({
  patientId,
  assignedDoctorId,
  assignmentReason,
  onAssignmentComplete,
}: DoctorAssignmentCardProps) {
  const [doctorData, setDoctorData] = useState<{
    firstName: string;
    lastName: string;
    specialization: string;
    yearsInPractice: string;
    hospitalAffiliation?: string;
    availability?: string;
  } | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const { assignDoctor, loading } = useAssignPatientToDoctor();

  useEffect(() => {
    if (assignedDoctorId) {
      loadDoctorData();
    }
  }, [assignedDoctorId]);

  const loadDoctorData = async () => {
    if (!assignedDoctorId) return;

    try {
      const doctorDoc = await getDoc(doc(db, "users", assignedDoctorId));
      if (doctorDoc.exists()) {
        setDoctorData(doctorDoc.data() as typeof doctorData);
      }
    } catch (error) {
      console.error("Error loading doctor data:", error);
    }
  };

  const handleAutoAssign = async () => {
    try {
      const result = await assignDoctor({ patientId });
      if (result.success) {
        alert(result.message || "Doctor assigned successfully!");
        onAssignmentComplete?.();
      }
    } catch (error) {
      alert("Failed to assign doctor. Please try again.");
      console.error("Error assigning doctor:", error);
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

  if (!assignedDoctorId) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Assigned Doctor</h3>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            Not Assigned
          </span>
        </div>
        <p className="text-gray-600 mb-4">
          No doctor has been assigned yet. Click below to get matched with the best available doctor based on your health needs.
        </p>
        <button
          onClick={handleAutoAssign}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Assigning..." : "Find Available Doctor"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Assigned Doctor</h3>
        {doctorData?.availability && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(doctorData.availability)}`}>
            {getAvailabilityIcon(doctorData.availability)} {doctorData.availability}
          </span>
        )}
      </div>

      {doctorData ? (
        <div className="space-y-4">
          {/* Doctor Info */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="text-xl font-semibold text-gray-900">
              Dr. {doctorData.firstName} {doctorData.lastName}
            </h4>
            <p className="text-gray-600 font-medium">{doctorData.specialization}</p>
            {doctorData.hospitalAffiliation && (
              <p className="text-sm text-gray-500">{doctorData.hospitalAffiliation}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {doctorData.yearsInPractice} years of experience
            </p>
          </div>

          {/* Assignment Reasoning Toggle */}
          {assignmentReason && (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center justify-between w-full text-left text-gray-700 hover:text-gray-900"
              >
                <span className="font-medium">Why was this doctor selected?</span>
                <svg
                  className={`w-5 h-5 transition-transform ${showReasoning ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Reasoning Details */}
              {showReasoning && (
                <div className="mt-4 space-y-3 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Match Score</span>
                    <span className="text-lg font-bold text-blue-600">{assignmentReason.score}/225</span>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <h5 className="text-sm font-semibold text-gray-700">Scoring Breakdown:</h5>

                    {/* Specialization Match */}
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">{assignmentReason.factors.specializationMatch ? "✓" : "○"}</span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          <strong>Specialization Match</strong>
                          {assignmentReason.factors.matchedConditions.length > 0 && (
                            <span className="ml-2 text-green-600">
                              ({assignmentReason.factors.matchedConditions.join(", ")})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          +{assignmentReason.factors.matchedConditions.length * 100} points
                        </p>
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">{assignmentReason.factors.availabilityBonus > 0 ? "✓" : "○"}</span>
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

          {/* Re-assign Button */}
          <button
            onClick={handleAutoAssign}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Reassigning..." : "Request Different Doctor"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
