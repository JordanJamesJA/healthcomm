import { FaHeartbeat } from "react-icons/fa";

export default function DashboardHeader() {
  return (
    <header className="flex justify-between items-center mb-10">
      <div className="flex items-center gap-3">
        <FaHeartbeat className="text-green-600 text-3xl" />
        <h1 className="text-3xl font-bold">HealthComm</h1>
      </div>

      <div className="flex gap-3">
        <button className="border px-4 py-1 rounded-lg text-sm hover:bg-gray-100">
          Light
        </button>
        <button className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-green-700">
          Logout
        </button>
      </div>
    </header>
  );
}
