import type { FC } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import RoleCard from "../components/RoleCard";
import { Stethoscope, HeartPulse, Users } from "lucide-react";
import { useDarkMode } from "../contexts/useDarkMode";

const Home: FC = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navbar />

      {/* Optional dark mode toggle button at top-right */}
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={toggleDarkMode}
          className="border px-4 py-1 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? "Dark" : "Light"}
        </button>
      </div>

      <section className="text-center px-6 py-16">
        <div className="flex justify-center mb-4">
          <HeartPulse size={36} className="text-green-600" />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Advanced Health Monitoring Platform
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
          Monitor glucose, hypertension, and vital signs with real-time data for
          patients, medical professionals, and caretakers.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <RoleCard
            icon={<Stethoscope size={28} />}
            title="Medical Professional"
            description="Monitor and care for multiple patients with comprehensive health data."
          >
            <Link
              to="/signup/medical"
              className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition"
            >
              Sign Up as Doctor
            </Link>
          </RoleCard>

          <RoleCard
            icon={<HeartPulse size={28} />}
            title="Patient"
            description="Track your vital signs and connect with healthcare providers."
          >
            <Link
              to="/signup/patient"
              className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition"
            >
              Sign Up as Patient
            </Link>
          </RoleCard>

          <RoleCard
            icon={<Users size={28} />}
            title="Caretaker"
            description="Stay informed about your loved ones' health status in real-time."
          >
            <Link
              to="/signup/caretaker"
              className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition"
            >
              Sign Up as Caretaker
            </Link>
          </RoleCard>
        </div>
      </section>
    </div>
  );
};

export default Home;
