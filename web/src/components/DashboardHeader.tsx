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
    <header className="flex justify-between items-center mb-10 flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <FaHeartbeat className="text-green-600 text-2xl sm:text-3xl" />
        <h1 className="text-2xl sm:text-3xl font-bold">HealthComm</h1>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={toggleDarkMode}
          className="border px-2 sm:px-4 py-1 rounded-lg text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
          aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? "☀️" : "🌙"}
          <span className="hidden sm:inline ml-1">{darkMode ? "Light" : "Dark"}</span>
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="border px-2 sm:px-4 py-1 rounded-lg text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 sm:gap-2 whitespace-nowrap"
          aria-label="Settings"
        >
          <FaCog />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="bg-green-600 text-white px-2 sm:px-4 py-1 rounded-lg text-xs sm:text-sm hover:bg-green-700 whitespace-nowrap"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
