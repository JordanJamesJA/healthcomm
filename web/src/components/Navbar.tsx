import { Link } from "react-router-dom";
import { FaHeartbeat } from "react-icons/fa";
import { useDarkMode } from "../contexts/useDarkMode";

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-300">
      <Link
        to="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <FaHeartbeat className="text-green-600 dark:text-green-400 text-2xl" />
        <h1 className="font-semibold text-xl text-gray-900 dark:text-gray-100">
          HealthComm
        </h1>
      </Link>
      <div className="flex gap-4">
        <button
          onClick={toggleDarkMode}
          className="px-4 py-1 border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300"
        >
          {darkMode ? "Light" : "Dark"}
        </button>
        <Link
          to="/login"
          className="px-4 py-1 border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300 flex items-center gap-2"
        >
          Login
        </Link>
      </div>
    </nav>
  );
}
