import { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  FaUsers,
  FaChartLine,
  FaExclamationTriangle,
  FaBell,
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaChartBar,
} from "react-icons/fa";
import InfoCard from "../components/InfoCard";
import type {
  AppUser,
  Alert,
  Patient,
} from "../contexts/AuthTypes";

interface CaretakerDashboardProps {
  user: AppUser;
}

// Analytics helper functions
const calculateAverage = (values: (number | undefined)[]): number => {
  const validValues = values.filter((v): v is number => v !== undefined && !isNaN(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
};

export default function CaretakerDashboard({ user }: CaretakerDashboardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(9); // 3x3 grid
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "stable" | "warning" | "critical">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch patients assigned to caretaker
  useEffect(() => {
    if (!user.uid) return;

    const patientsRef = collection(db, "users");
    const q = query(
      patientsRef,
      where("role", "==", "patient"),
      where("assignedCaretakerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const patientsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || "Unknown",
            lastName: data.lastName || "Patient",
            lastVitals: data.lastVitals,
            status: data.status || "stable",
          } as Patient;
        });
        setPatients(patientsList);
      },
      (error) => {
        console.error("Error fetching patients:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Fetch alerts for all assigned patients (optimized)
  useEffect(() => {
    if (patients.length === 0) return;

    const unsubscribes = patients.map((patient) => {
      const alertsRef = collection(db, `patients/${patient.id}/alerts`);
      const q = query(alertsRef, orderBy("timestamp", "desc"), limit(5));

      return onSnapshot(
        q,
        (snapshot) => {
          const patientAlerts = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              title: data.title || "Alert",
              message: data.message || "",
              severity: data.severity || "low",
              timestamp:
                data.timestamp instanceof Timestamp
                  ? data.timestamp.toDate()
                  : data.timestamp,
            } as Alert;
          });

          setAlerts((prev) => {
            const filtered = prev.filter((a) => a.patientId !== patient.id);
            return [...filtered, ...patientAlerts].sort((a, b) => {
              const timeA =
                a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
              const timeB =
                b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
              return timeB - timeA;
            });
          });
        },
        (error) => {
          console.error(
            `Error fetching alerts for patient ${patient.id}:`,
            error
          );
        }
      );
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [patients]);

  // Memoized filtered and searched patients
  const filteredPatients = useMemo(() => {
    let filtered = patients;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.firstName.toLowerCase().includes(query) ||
          p.lastName.toLowerCase().includes(query) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [patients, statusFilter, searchQuery]);

  // Memoized pagination
  const paginatedPatients = useMemo(() => {
    const indexOfLastPatient = currentPage * patientsPerPage;
    const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
    return filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  }, [filteredPatients, currentPage, patientsPerPage]);

  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  // Memoized analytics
  const analytics = useMemo(() => {
    const allHeartRates = patients.map((p) => p.lastVitals?.heartRate);
    const allOxygen = patients.map((p) => p.lastVitals?.oxygenLevel);

    return {
      avgHeartRate: calculateAverage(allHeartRates),
      avgOxygen: calculateAverage(allOxygen),
      totalAlerts: alerts.length,
      highPriorityAlerts: alerts.filter((a) => a.severity === "high").length,
      mediumPriorityAlerts: alerts.filter((a) => a.severity === "medium").length,
    };
  }, [patients, alerts]);

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status: "all" | "stable" | "warning" | "critical") => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  return (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <InfoCard title="Total Patients">
          <div className="flex items-center gap-3">
            <FaUsers className="text-green-600 dark:text-green-400 text-3xl" />
            <p className="text-3xl font-bold dark:text-white">
              {patients.length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Critical Alerts">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-3xl" />
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {alerts.filter((a) => a.severity === "high").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Active Warnings">
          <div className="flex items-center gap-3">
            <FaBell className="text-yellow-600 dark:text-yellow-400 text-3xl" />
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {alerts.filter((a) => a.severity === "medium").length}
            </p>
          </div>
        </InfoCard>

        <InfoCard title="Stable Patients">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-green-600 dark:text-green-400 text-3xl" />
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {patients.filter((p) => p.status === "stable").length}
            </p>
          </div>
        </InfoCard>
      </div>

      {/* Analytics Summary */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <FaChartBar className="text-blue-600 dark:text-blue-400" />
          Analytics Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="Average Vitals">
            <div className="space-y-2 text-sm">
              {analytics.avgHeartRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Heart Rate:</span>
                  <span className="font-semibold dark:text-white">
                    {analytics.avgHeartRate.toFixed(0)} bpm
                  </span>
                </div>
              )}
              {analytics.avgOxygen > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Oxygen:</span>
                  <span className="font-semibold dark:text-white">
                    {analytics.avgOxygen.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Alert Statistics">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Alerts:</span>
                <span className="font-bold text-lg dark:text-white">{analytics.totalAlerts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">High Priority:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {analytics.highPriorityAlerts}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Medium Priority:</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">
                  {analytics.mediumPriorityAlerts}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>
      </section>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">
            Recent Alerts
          </h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 transition-colors duration-300 ${
                  alert.severity === "high"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : alert.severity === "medium"
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold dark:text-white">
                      {alert.patientName}
                    </p>
                    <p className="text-sm dark:text-gray-300">{alert.title}</p>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h3 className="text-xl font-semibold dark:text-white">
            Your Patients ({filteredPatients.length})
          </h3>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white w-full md:w-64"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <FaFilter />
              Filters
            </button>
          </div>
        </div>

        {/* Filter Buttons */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium mb-2 dark:text-white">Filter by Status:</p>
            <div className="flex flex-wrap gap-2">
              {(["all", "critical", "warning", "stable"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilterChange(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? status === "critical"
                        ? "bg-red-600 text-white"
                        : status === "warning"
                        ? "bg-yellow-600 text-white"
                        : status === "stable"
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== "all" && ` (${patients.filter((p) => p.status === status).length})`}
                  {status === "all" && ` (${patients.length})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredPatients.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPatients.map((patient) => (
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
                          ? "text-green-600 dark:text-green-400"
                          : patient.status === "warning"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
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
                      <span className="dark:text-white">
                        {patient.lastVitals.heartRate} bpm
                      </span>
                    </div>
                  )}
                  {patient.lastVitals?.oxygenLevel && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        O2 Level:
                      </span>
                      <span className="dark:text-white">
                        {patient.lastVitals.oxygenLevel}%
                      </span>
                    </div>
                  )}
                  <button className="w-full mt-3 bg-green-600 dark:bg-green-500 text-white py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors">
                    View Details
                  </button>
                </div>
              </InfoCard>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FaChevronLeft className="dark:text-white" />
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          currentPage === page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2 py-2 dark:text-white">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FaChevronRight className="dark:text-white" />
              </button>

              <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages} ({filteredPatients.length} patients)
              </span>
            </div>
          )}
        </>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <FaUsers className="text-gray-400 text-4xl mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || statusFilter !== "all"
                ? "No patients match your search criteria"
                : "No patients assigned yet"}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
