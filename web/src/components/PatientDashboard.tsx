import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { FaUserMd, FaPlug } from "react-icons/fa";
import AlertBox from "../components/AlertBox";
import InfoCard from "../components/InfoCard";
import VitalStat from "../components/VitalStat";
import TimeRangeSelector from "../components/TimeRangeSelector";
import VitalChart from "../components/VitalChart";
import type { AppUser, VitalData, Alert } from "../contexts/AuthTypes";

interface PatientDashboardProps {
  user: AppUser;
}

export default function PatientDashboard({ user }: PatientDashboardProps) {
  const [range, setRange] = useState("6h");
  const [vitals, setVitals] = useState<VitalData | null>(null);
  const [vitalHistory, setVitalHistory] = useState<VitalData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Convert vitalHistory to have only Date timestamps for charts
  const chartData: VitalData[] = vitalHistory.map((vital) => ({
    ...vital,
    timestamp:
      vital.timestamp instanceof Timestamp
        ? vital.timestamp.toDate()
        : vital.timestamp,
  }));

  // Fetch real-time vitals
  useEffect(() => {
    if (!user.uid) return;

    const vitalsRef = collection(db, `patients/${user.uid}/vitals`);
    const q = query(vitalsRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as VitalData;
          setVitals(data);
        }
      },
      (error) => {
        console.error("Error fetching vitals:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Fetch vital history for charts
  useEffect(() => {
    if (!user.uid) return;

    const vitalsRef = collection(db, `patients/${user.uid}/vitals`);
    const q = query(vitalsRef, orderBy("timestamp", "desc"), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history: VitalData[] = snapshot.docs.map((doc) => {
          const data = doc.data() as VitalData;
          return {
            ...data,
            timestamp:
              data.timestamp instanceof Timestamp
                ? data.timestamp.toDate()
                : data.timestamp,
          } as VitalData;
        });
        setVitalHistory(history);
      },
      (error) => {
        console.error("Error fetching vital history:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid, range]);

  // Fetch alerts
  useEffect(() => {
    if (!user.uid) return;

    const alertsRef = collection(db, `patients/${user.uid}/alerts`);
    const q = query(alertsRef, orderBy("timestamp", "desc"), limit(5));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const alertsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Alert",
            message: data.message || "",
            severity: data.severity || "low",
            timestamp:
              data.timestamp instanceof Timestamp
                ? data.timestamp.toDate()
                : data.timestamp,
          } as Alert;
        });
        setAlerts(alertsList);
      },
      (error) => {
        console.error("Error fetching alerts:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const hasDevice = user.connectedDevices && user.connectedDevices.length > 0;
  const hasVitals = vitals && Object.keys(vitals).length > 1;

  return (
    <>
      {/* Critical Alerts */}
      {alerts
        .filter((a) => a.severity === "high")
        .map((alert) => (
          <AlertBox
            key={alert.id}
            title={alert.title}
            message={alert.message}
            subtext="Please consult with your doctor immediately if this persists."
          />
        ))}

      {/* Patient Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <InfoCard title="Patient Information">
          <ul className="text-sm space-y-2">
            <li>
              <strong>Patient ID:</strong>{" "}
              <span className="text-green-600 dark:text-green-400 font-medium">
                {user.uid.slice(0, 8).toUpperCase()}
              </span>
            </li>
            <li>
              <strong>Blood Type:</strong> {user.bloodType || "N/A"}
            </li>
            <li>
              <strong>Date of Birth:</strong> {user.dateOfBirth || "N/A"}
            </li>
            <li>
              <strong>Allergies:</strong> {user.knownAllergies || "None"}
            </li>
          </ul>
        </InfoCard>

        <InfoCard title="Assigned Doctor">
          <div className="flex items-center gap-2">
            <FaUserMd className="text-green-600 dark:text-green-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {user.assignedDoctor || "No healthcare professional connected"}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Connected Device">
          <div className="flex items-center gap-2">
            <FaPlug
              className={
                hasDevice
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400"
              }
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {hasDevice
                ? `Connected: ${user.connectedDevices?.join(", ")}`
                : "No device connected"}
            </p>
          </div>
          {!hasDevice && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Connect a device to start monitoring your vitals
            </p>
          )}
        </InfoCard>
      </div>

      {/* Current Vital Signs */}
      <section>
        <h3 className="text-xl font-semibold mb-4 dark:text-white">
          Current Vital Signs
        </h3>
        {hasDevice && hasVitals ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {vitals.heartRate && (
              <VitalStat label="Heart Rate" value={`${vitals.heartRate} bpm`} />
            )}
            {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic && (
              <VitalStat
                label="Blood Pressure"
                value={`${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg`}
              />
            )}
            {vitals.oxygenLevel && (
              <VitalStat
                label="Oxygen Level"
                value={`${vitals.oxygenLevel}%`}
              />
            )}
            {vitals.temperature && (
              <VitalStat
                label="Temperature"
                value={`${vitals.temperature}°C`}
              />
            )}
            {vitals.glucose && (
              <VitalStat label="Glucose" value={`${vitals.glucose} mg/dL`} />
            )}
            {vitals.respiration && (
              <VitalStat
                label="Respiration"
                value={`${vitals.respiration} bpm`}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <FaPlug className="text-gray-400 text-4xl mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              No device connected
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Connect a monitoring device to view your real-time vitals
            </p>
          </div>
        )}
      </section>

      {/* Vital Trends */}
      {hasDevice && vitalHistory.length > 0 && (
        <section className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold dark:text-white">
              Vital Trends
            </h3>
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <VitalChart
              vital="Heart Rate"
              range={range}
              data={chartData}
              dataKey="heartRate"
            />
            <VitalChart
              vital="Blood Pressure"
              range={range}
              data={chartData}
              dataKey="bloodPressure"
            />
            <VitalChart
              vital="Oxygen Level"
              range={range}
              data={chartData}
              dataKey="oxygenLevel"
            />
            <VitalChart
              vital="Temperature"
              range={range}
              data={chartData}
              dataKey="temperature"
            />
            <VitalChart
              vital="Glucose"
              range={range}
              data={chartData}
              dataKey="glucose"
            />
            <VitalChart
              vital="Respiration"
              range={range}
              data={chartData}
              dataKey="respiration"
            />
          </div>
        </section>
      )}
    </>
  );
}
