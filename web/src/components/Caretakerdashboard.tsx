import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  FaUsers,
  FaChartLine,
  FaExclamationTriangle,
  FaBell,
} from "react-icons/fa";
import InfoCard from "../components/InfoCard";
import type {
  AppUser,
  Alert,
  Patient,
} from "../contexts/AuthTypes";

interface CaretakerDashboardProps {
  user: AppUser;
}

export default function CaretakerDashboard({ user }: CaretakerDashboardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Fetch patients assigned to caretaker
  useEffect(() => {
    if (!user.uid) return;

    const patientsRef = collection(db, "users");
    const q = query(
      patientsRef,
      where("role", "==", "patient"),
      where("assignedCaretakerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const patientsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || "Unknown",
            lastName: data.lastName || "Patient",
            lastVitals: data.lastVitals,
            status: data.status || "stable",
          } as Patient;
        });
        setPatients(patientsList);
      },
      (error) => {
        console.error("Error fetching patients:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Fetch alerts for all assigned patients
  useEffect(() => {
    if (patients.length === 0) return;

    const unsubscribes = patients.map((patient) => {
      const alertsRef = collection(db, `patients/${patient.id}/alerts`);
      const q = query(alertsRef, orderBy("timestamp", "desc"), limit(3));

      return onSnapshot(
        q,
        (snapshot) => {
          const patientAlerts = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              title: data.title || "Alert",
              message: data.message || "",
              severity: data.severity || "low",
              timestamp:
                data.timestamp instanceof Timestamp
                  ? data.timestamp.toDate()
                  : data.timestamp,
            } as Alert;
          });

          setAlerts((prev) => {
            const filtered = prev.filter((a) => a.patientId !== patient.id);
            return [...filtered, ...patientAlerts].sort((a, b) => {
              const timeA =
                a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
              const timeB =
                b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
              return timeB - timeA;
            });
          });
        },
        (error) => {
          console.error(
            `Error fetching alerts for patient ${patient.id}:`,
            error
          );
        }
      );
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [patients]);

  return (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <InfoCard title="Total Patients">
          <div className="flex items-center gap-3">
            <FaUsers className="text-green-600 dark:text-green-400 text-3xl" />
            <p className="text-3xl font-bold dark:text-white">
              {patients.length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Critical Alerts">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-3xl" />
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {alerts.filter((a) => a.severity === "high").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Active Warnings">
          <div className="flex items-center gap-3">
            <FaBell className="text-yellow-600 dark:text-yellow-400 text-3xl" />
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {alerts.filter((a) => a.severity === "medium").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Stable Patients">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-green-600 dark:text-green-400 text-3xl" />
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {patients.filter((p) => p.status === "stable").length}
            </p>
          </div>
        </InfoCard>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">
            Recent Alerts
          </h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 transition-colors duration-300 ${
                  alert.severity === "high"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : alert.severity === "medium"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold dark:text-white">
                      {alert.patientName}
                    </p>
                    <p className="text-sm dark:text-gray-300">{alert.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {alert.message}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.severity === "high"
                        ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
                        : alert.severity === "medium"
                        ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
                        : "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                    }`}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Assigned Patients */}
      <section>
        <h3 className="text-xl font-semibold mb-4 dark:text-white">
          Your Patients
        </h3>
        {patients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <InfoCard
                key={patient.id}
                title={`${patient.firstName} ${patient.lastName}`}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`font-medium ${
                        patient.status === "stable"
                          ? "text-green-600 dark:text-green-400"
                          : patient.status === "warning"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {patient.status.toUpperCase()}
                    </span>
                  </div>
                  {patient.lastVitals?.heartRate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Heart Rate:
                      </span>
                      <span className="dark:text-white">
                        {patient.lastVitals.heartRate} bpm
                      </span>
                    </div>
                  )}
                  {patient.lastVitals?.oxygenLevel && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        O2 Level:
                      </span>
                      <span className="dark:text-white">
                        {patient.lastVitals.oxygenLevel}%
                      </span>
                    </div>
                  )}
                  <button className="w-full mt-3 bg-green-600 dark:bg-green-500 text-white py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors">
                    View Details
                  </button>
                </div>
              </InfoCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <FaUsers className="text-gray-400 text-4xl mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No patients assigned yet
            </p>
          </div>
        )}
      </section>
    </>
  );
}
