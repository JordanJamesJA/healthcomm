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
  FaUserMd,
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

interface MedicalDashboardProps {
  user: AppUser;
}

export default function MedicalDashboard({ user }: MedicalDashboardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Fetch patients assigned to medical professional
  useEffect(() => {
    if (!user.uid) return;

    const patientsRef = collection(db, "users");
    const q = query(
      patientsRef,
      where("role", "==", "patient"),
      where("assignedDoctorId", "==", user.uid)
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
        <InfoCard title="Active Patients">
          <div className="flex items-center gap-3">
            <FaUsers className="text-green-600 dark:text-green-400 text-3xl" />
            <p className="text-3xl font-bold dark:text-white">
              {patients.length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Critical Cases">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-3xl" />
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {patients.filter((p) => p.status === "critical").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Warnings">
          <div className="flex items-center gap-3">
            <FaBell className="text-yellow-600 dark:text-yellow-400 text-3xl" />
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {patients.filter((p) => p.status === "warning").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Stable">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-green-600 dark:text-green-400 text-3xl" />
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {patients.filter((p) => p.status === "stable").length}
            </p>
          </div>
        </InfoCard>
      </div>

      {/* Priority Alerts */}
      {alerts.filter((a) => a.severity === "high").length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400" />
            Priority Alerts - Immediate Attention Required
          </h3>
          <div className="space-y-3">
            {alerts
              .filter((a) => a.severity === "high")
              .map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 transition-colors duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-red-700 dark:text-red-400">
                        {alert.patientName}
                      </p>
                      <p className="text-sm font-semibold mt-1 dark:text-white">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {alert.message}
                      </p>
                    </div>
                    <button className="bg-red-600 dark:bg-red-500 text-white px-4 py-1 rounded text-sm hover:bg-red-700 dark:hover:bg-red-600 transition-colors">
                      Review
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Patient List */}
      <section>
        <h3 className="text-xl font-semibold mb-4 dark:text-white">
          Patient Overview
        </h3>
        {patients.length > 0 ? (
          <div className="space-y-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`p-4 rounded-xl border-2 transition-colors duration-300 ${
                  patient.status === "critical"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                    : patient.status === "warning"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                    : "border-green-500 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg dark:text-white">
                      {patient.firstName} {patient.lastName}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      {patient.lastVitals?.heartRate && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Heart Rate
                          </p>
                          <p className="font-semibold dark:text-white">
                            {patient.lastVitals.heartRate} bpm
                          </p>
                        </div>
                      )}
                      {patient.lastVitals?.bloodPressureSystolic && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">BP</p>
                          <p className="font-semibold dark:text-white">
                            {patient.lastVitals.bloodPressureSystolic}/
                            {patient.lastVitals.bloodPressureDiastolic}
                          </p>
                        </div>
                      )}
                      {patient.lastVitals?.oxygenLevel && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            O2 Level
                          </p>
                          <p className="font-semibold dark:text-white">
                            {patient.lastVitals.oxygenLevel}%
                          </p>
                        </div>
                      )}
                      {patient.lastVitals?.temperature && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Temperature
                          </p>
                          <p className="font-semibold dark:text-white">
                            {patient.lastVitals.temperature}°C
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.status === "critical"
                          ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
                          : patient.status === "warning"
                          ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
                          : "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                      }`}
                    >
                      {patient.status.toUpperCase()}
                    </span>
                    <button className="bg-green-600 dark:bg-green-500 text-white px-4 py-1 rounded text-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors">
                      View Chart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <FaUserMd className="text-gray-400 text-4xl mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No patients assigned yet
            </p>
          </div>
        )}
      </section>
    </>
  );
}
