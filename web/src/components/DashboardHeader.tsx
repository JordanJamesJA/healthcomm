import { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  FaUserMd,
  FaPlug,
  FaUsers,
  FaChartLine,
  FaExclamationTriangle,
  FaBell,
} from "react-icons/fa";
import DashboardHeader from "../../components/DashboardHeader";
import AlertBox from "../../components/AlertBox";
import InfoCard from "../../components/InfoCard";
import VitalStat from "../../components/VitalStat";
import TimeRangeSelector from "../../components/TimeRangeSelector";
import VitalChart from "../../components/VitalChart";
import AuthContext from "../../contexts/AuthContext";

interface VitalData {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenLevel?: number;
  temperature?: number;
  glucose?: number;
  respiration?: number;
  timestamp?: Date;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: Date;
  patientId?: string;
  patientName?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  lastVitals?: VitalData;
  status: "stable" | "warning" | "critical";
}

export default function Dashboard() {
  const authContext = useContext(AuthContext);
  const { role: urlRole } = useParams<{ role: string }>();

  if (!authContext) {
    throw new Error("Dashboard must be used within an AuthProvider");
  }

  const { user, loading } = authContext;
  const [range, setRange] = useState("6h");
  const [vitals, setVitals] = useState<VitalData | null>(null);
  const [vitalHistory, setVitalHistory] = useState<VitalData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const navigate = useNavigate();

  if (loading) return <p className="dark:text-white">Loading...</p>;

  if (!user) {
    navigate("/login");
    return null;
  }

  const role = user.role;

  // Verify URL role matches user role
  if (urlRole && role !== urlRole) {
    navigate(`/dashboard/${role}`, { replace: true });
    return null;
  }

  // Fetch real-time vitals for patient
  useEffect(() => {
    if (role !== "patient" || !user.uid) return;

    const vitalsRef = collection(db, `patients/${user.uid}/vitals`);
    const q = query(vitalsRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as VitalData;
        setVitals(data);
      }
    });

    return () => unsubscribe();
  }, [role, user.uid]);

  // Fetch vital history for charts
  useEffect(() => {
    if (role !== "patient" || !user.uid) return;

    const vitalsRef = collection(db, `patients/${user.uid}/vitals`);
    const q = query(vitalsRef, orderBy("timestamp", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((doc) => doc.data() as VitalData);
      setVitalHistory(history);
    });

    return () => unsubscribe();
  }, [role, user.uid, range]);

  // Fetch alerts for patient
  useEffect(() => {
    if (role !== "patient" || !user.uid) return;

    const alertsRef = collection(db, `patients/${user.uid}/alerts`);
    const q = query(alertsRef, orderBy("timestamp", "desc"), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsList = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Alert)
      );
      setAlerts(alertsList);
    });

    return () => unsubscribe();
  }, [role, user.uid]);

  // Fetch patients for medical/caretaker
  useEffect(() => {
    if (role === "patient" || !user.uid) return;

    const patientsRef = collection(db, "users");
    const q = query(
      patientsRef,
      where("role", "==", "patient"),
      where(
        role === "medical" ? "assignedDoctorId" : "assignedCaretakerId",
        "==",
        user.uid
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientsList = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Patient)
      );
      setPatients(patientsList);
    });

    return () => unsubscribe();
  }, [role, user.uid]);

  // Fetch all alerts for medical/caretaker
  useEffect(() => {
    if (role === "patient" || patients.length === 0) return;

    const unsubscribes = patients.map((patient) => {
      const alertsRef = collection(db, `patients/${patient.id}/alerts`);
      const q = query(alertsRef, orderBy("timestamp", "desc"), limit(3));

      return onSnapshot(q, (snapshot) => {
        const patientAlerts = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              ...doc.data(),
            } as Alert)
        );

        setAlerts((prev) => {
          const filtered = prev.filter((a) => a.patientId !== patient.id);
          return [...filtered, ...patientAlerts].sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
          );
        });
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [role, patients]);

  // PATIENT DASHBOARD
  const renderPatientDashboard = () => {
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
                <span className="text-green-600 font-medium">
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
              <FaUserMd className="text-green-600" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user.assignedDoctor || "No healthcare professional connected"}
              </p>
            </div>
          </InfoCard>

          <InfoCard title="Connected Device">
            <div className="flex items-center gap-2">
              <FaPlug
                className={hasDevice ? "text-green-600" : "text-gray-400"}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {hasDevice
                  ? `Connected: ${user.connectedDevices.join(", ")}`
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
          <h3 className="text-xl font-semibold mb-4">Current Vital Signs</h3>
          {hasDevice && hasVitals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {vitals.heartRate && (
                <VitalStat
                  label="Heart Rate"
                  value={`${vitals.heartRate} bpm`}
                />
              )}
              {vitals.bloodPressureSystolic &&
                vitals.bloodPressureDiastolic && (
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
              <h3 className="text-xl font-semibold">Vital Trends</h3>
              <TimeRangeSelector value={range} onChange={setRange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <VitalChart
                vital="Heart Rate"
                range={range}
                data={vitalHistory}
                dataKey="heartRate"
              />
              <VitalChart
                vital="Blood Pressure"
                range={range}
                data={vitalHistory}
                dataKey="bloodPressure"
              />
              <VitalChart
                vital="Oxygen Level"
                range={range}
                data={vitalHistory}
                dataKey="oxygenLevel"
              />
              <VitalChart
                vital="Temperature"
                range={range}
                data={vitalHistory}
                dataKey="temperature"
              />
              <VitalChart
                vital="Glucose"
                range={range}
                data={vitalHistory}
                dataKey="glucose"
              />
              <VitalChart
                vital="Respiration"
                range={range}
                data={vitalHistory}
                dataKey="respiration"
              />
            </div>
          </section>
        )}
      </>
    );
  };

  // CARETAKER DASHBOARD
  const renderCaretakerDashboard = () => (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <InfoCard title="Total Patients">
          <div className="flex items-center gap-3">
            <FaUsers className="text-green-600 text-3xl" />
            <p className="text-3xl font-bold">{patients.length}</p>
          </div>
        </InfoCard>

        <InfoCard title="Critical Alerts">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-600 text-3xl" />
            <p className="text-3xl font-bold text-red-600">
              {alerts.filter((a) => a.severity === "high").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Active Warnings">
          <div className="flex items-center gap-3">
            <FaBell className="text-yellow-600 text-3xl" />
            <p className="text-3xl font-bold text-yellow-600">
              {alerts.filter((a) => a.severity === "medium").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Stable Patients">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-green-600 text-3xl" />
            <p className="text-3xl font-bold text-green-600">
              {patients.filter((p) => p.status === "stable").length}
            </p>
          </div>
        </InfoCard>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === "high"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : alert.severity === "medium"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{alert.patientName}</p>
                    <p className="text-sm">{alert.title}</p>
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
        <h3 className="text-xl font-semibold mb-4">Your Patients</h3>
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
                          ? "text-green-600"
                          : patient.status === "warning"
                          ? "text-yellow-600"
                          : "text-red-600"
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
                      <span>{patient.lastVitals.heartRate} bpm</span>
                    </div>
                  )}
                  {patient.lastVitals?.oxygenLevel && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        O2 Level:
                      </span>
                      <span>{patient.lastVitals.oxygenLevel}%</span>
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

  // MEDICAL PROFESSIONAL DASHBOARD
  const renderMedicalDashboard = () => (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <InfoCard title="Active Patients">
          <div className="flex items-center gap-3">
            <FaUsers className="text-green-600 text-3xl" />
            <p className="text-3xl font-bold">{patients.length}</p>
          </div>
        </InfoCard>

        <InfoCard title="Critical Cases">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-600 text-3xl" />
            <p className="text-3xl font-bold text-red-600">
              {patients.filter((p) => p.status === "critical").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Warnings">
          <div className="flex items-center gap-3">
            <FaBell className="text-yellow-600 text-3xl" />
            <p className="text-3xl font-bold text-yellow-600">
              {patients.filter((p) => p.status === "warning").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Stable">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-green-600 text-3xl" />
            <p className="text-3xl font-bold text-green-600">
              {patients.filter((p) => p.status === "stable").length}
            </p>
          </div>
        </InfoCard>
      </div>

      {/* Priority Alerts */}
      {alerts.filter((a) => a.severity === "high").length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaExclamationTriangle className="text-red-600" />
            Priority Alerts - Immediate Attention Required
          </h3>
          <div className="space-y-3">
            {alerts
              .filter((a) => a.severity === "high")
              .map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-red-700 dark:text-red-400">
                        {alert.patientName}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {alert.message}
                      </p>
                    </div>
                    <button className="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700 transition-colors">
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
        <h3 className="text-xl font-semibold mb-4">Patient Overview</h3>
        {patients.length > 0 ? (
          <div className="space-y-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`p-4 rounded-xl border-2 ${
                  patient.status === "critical"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                    : patient.status === "warning"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                    : "border-green-500 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">
                      {patient.firstName} {patient.lastName}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      {patient.lastVitals?.heartRate && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Heart Rate
                          </p>
                          <p className="font-semibold">
                            {patient.lastVitals.heartRate} bpm
                          </p>
                        </div>
                      )}
                      {patient.lastVitals?.bloodPressureSystolic && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">BP</p>
                          <p className="font-semibold">
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
                          <p className="font-semibold">
                            {patient.lastVitals.oxygenLevel}%
                          </p>
                        </div>
                      )}
                      {patient.lastVitals?.temperature && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Temperature
                          </p>
                          <p className="font-semibold">
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

  const renderRoleDashboard = () => {
    switch (role) {
      case "patient":
        return renderPatientDashboard();
      case "caretaker":
        return renderCaretakerDashboard();
      case "medical":
        return renderMedicalDashboard();
      default:
        return <p className="text-red-500">Invalid role</p>;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-8 py-10 transition-colors duration-300">
      <DashboardHeader />
      <section>
        <h2 className="text-2xl font-bold mb-1">
          Welcome, {user.firstName}{" "}
          <span className="font-normal text-md text-gray-600 dark:text-gray-400">
            | {role?.toUpperCase()}
          </span>
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {role === "patient"
            ? "Monitor your health vitals in real-time"
            : role === "caretaker"
            ? "Oversee your assigned patients' health status"
            : "Manage your patients and review medical data"}
        </p>
      </section>

      {renderRoleDashboard()}
    </div>
  );
}
