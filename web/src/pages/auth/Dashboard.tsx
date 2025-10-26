import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardHeader from "../../components/DashboardHeader";
import AuthContext from "../../contexts/AuthContext";
import PatientDashboard from "../../components/PatientDashboard";
import CaretakerDashboard from "../../components/Caretakerdashboard";
import MedicalDashboard from "../../components/Medicaldashboard";

export default function Dashboard() {
  const authContext = useContext(AuthContext);
  const { role: urlRole } = useParams<{ role: string }>();
  const navigate = useNavigate();

  if (!authContext) {
    throw new Error("Dashboard must be used within an AuthProvider");
  }

  const { user, loading } = authContext;

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
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

  // Render appropriate dashboard based on role
  const renderRoleDashboard = () => {
    switch (role) {
      case "patient":
        return <PatientDashboard user={user} />;
      case "caretaker":
        return <CaretakerDashboard user={user} />;
      case "medical":
        return <MedicalDashboard user={user} />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">Invalid role</p>
          </div>
        );
    }
  };

  // Get role-specific subtitle
  const getRoleSubtitle = () => {
    switch (role) {
      case "patient":
        return "Monitor your health vitals in real-time";
      case "caretaker":
        return "Oversee your assigned patients' health status";
      case "medical":
        return "Manage your patients and review medical data";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-8 py-10 transition-colors duration-300">
      <DashboardHeader />
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-1 dark:text-white">
          Welcome, {user.firstName}{" "}
          <span className="font-normal text-md text-gray-600 dark:text-gray-400">
            | {role?.toUpperCase()}
          </span>
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {getRoleSubtitle()}
        </p>
      </section>

      {renderRoleDashboard()}
    </div>
  );
}