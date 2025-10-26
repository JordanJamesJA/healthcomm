import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserMd, FaPlug } from "react-icons/fa";
import DashboardHeader from "../../components/DashboardHeader";
import AlertBox from "../../components/AlertBox";
import InfoCard from "../../components/InfoCard";
import VitalStat from "../../components/VitalStat";
import TimeRangeSelector from "../../components/TimeRangeSelector";
import VitalChart from "../../components/VitalChart";
import AuthContext from "../../contexts/AuthContext";

export default function Dashboard() {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("Dashboard must be used within an AuthProvider");
  }

  const { user, loading } = authContext;
  const [range, setRange] = useState("6h");
  const navigate = useNavigate();

  if (loading) return <p className="dark:text-white">Loading...</p>;

  if (!user) {
    navigate("/");
    return null;
  }

  const role = user.role;

  const renderPatientDashboard = () => (
    <>
      <AlertBox
        title="Vital Sign Alert!"
        message="Blood Oxygen spike detected: 90.1"
        subtext="Please consult with your doctor if this persists."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <InfoCard title="Patient Information">
          <ul className="text-sm space-y-2">
            <li>
              <strong>Patient Code:</strong>{" "}
              <span className="text-green-600 font-medium">GPFGK9F4</span>
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
            <FaPlug className="text-green-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {user.connectedDevices && user.connectedDevices.length > 0
                ? `Device Connected: ${user.connectedDevices.join(", ")}`
                : "No connected devices"}
            </p>
          </div>
        </InfoCard>
      </div>

      <section>
        <h3 className="text-xl font-semibold mb-4">Current Vital Signs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Heart Rate", value: "78 bpm" },
            { label: "Blood Pressure", value: "118/79 mmHg" },
            { label: "Oxygen Level", value: "97%" },
            { label: "Body Temperature", value: "36.8°C" },
          ].map((v, i) => (
            <VitalStat key={i} label={v.label} value={v.value} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Vital Trends</h3>
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            "Heart Rate",
            "Blood Pressure",
            "Oxygen Level",
            "Temperature",
            "Respiration",
            "Glucose",
          ].map((vital, i) => (
            <VitalChart key={i} vital={vital} range={range} />
          ))}
        </div>
      </section>
    </>
  );

  const renderCaretakerDashboard = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">Caretaker Dashboard</h2>
      <p>
        Manage your assigned patients and monitor their health statuses here.
      </p>
    </div>
  );

  const renderMedicalDashboard = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        Medical Professional Dashboard
      </h2>
      <p>View patients, assigned cases, and medical stats.</p>
    </div>
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
            : "Access your dashboard tools"}
        </p>
      </section>

      {renderRoleDashboard()}
    </div>
  );
}
