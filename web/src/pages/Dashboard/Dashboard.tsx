import { useState } from "react";
import { FaUserMd, FaPlug } from "react-icons/fa";
import DashboardHeader from "../../components/DashboardHeader";
import AlertBox from "../../components/AlertBox";
import InfoCard from "../../components/InfoCard";
import VitalStat from "../../components/VitalStat";
import TimeRangeSelector from "../../components/TimeRangeSelector";
import VitalChart from "../../components/VitalChart";

export default function Dashboard() {
  const [range, setRange] = useState("6h");

  return (
    <div className="min-h-screen bg-white text-gray-900 px-8 py-10">
      <DashboardHeader />

      <section>
        <h2 className="text-2xl font-bold mb-1">
          Welcome, Grace Cummins{" "}
          <span className="font-normal text-md text-gray-600">| PATIENT</span>
        </h2>
        <p className="text-gray-600 mb-6">
          Monitor your health vitals in real-time
        </p>
      </section>

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
              <strong>Blood Type:</strong> B+
            </li>
            <li>
              <strong>Date of Birth:</strong> 1998-09-21
            </li>
            <li>
              <strong>Allergies:</strong> Bees
            </li>
          </ul>
        </InfoCard>

        <InfoCard title="Assigned Doctor">
          <div className="flex items-center gap-2">
            <FaUserMd className="text-green-600" />
            <p className="text-sm text-gray-600">
              No healthcare professional connected
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Connected Device">
          <div className="flex items-center gap-2">
            <FaPlug className="text-green-600" />
            <p className="text-sm text-gray-600">
              Device Connected: HealthBand X2
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
    </div>
  );
}
