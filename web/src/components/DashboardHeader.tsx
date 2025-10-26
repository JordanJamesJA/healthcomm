import { useContext } from "react";
import AuthContext from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaHeartbeat, FaCog } from "react-icons/fa";
import { useDarkMode } from "../contexts/useDarkMode";

export default function DashboardHeader() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();

  if (!authContext) {
    throw new Error("DashboardHeader must be used within an AuthProvider");
  }

  const { logout } = authContext;

  return (
    <header className="flex justify-between items-center mb-10">
      <div className="flex items-center gap-3">
        <FaHeartbeat className="text-green-600 text-3xl" />
        <h1 className="text-3xl font-bold">HealthComm</h1>
      </div>

      <div className="flex gap-3">
        <button
          onClick={toggleDarkMode}
          className="border px-4 py-1 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? "Light Mode" : "Dark "}
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="border px-4 py-1 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <FaCog /> Settings
        </button>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-green-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
