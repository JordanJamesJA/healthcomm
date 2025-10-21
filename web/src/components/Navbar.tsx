import { FaHeartbeat } from "react-icons/fa";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b bg-white">
      <div className="flex items-center gap-2">
        <FaHeartbeat className="text-green-600 text-2xl" />
        <h1 className="font-semibold text-xl">HealthComm</h1>
      </div>
      <div className="flex gap-4">
        <button className="px-4 py-1 border rounded-lg">🌙 Dark</button>
        <button className="px-4 py-1 border rounded-lg">➡️ Login</button>
      </div>
    </nav>
  );
}
