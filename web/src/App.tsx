import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/auth/Dashboard";
import { AuthProvider } from "./contexts/AuthContext";
import { DarkModeProvider } from "./contexts/DarkModeProvider";
import { useAuth } from "./hooks/useAuth";

// ProtectedRoute component
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth(); // hook from AuthContext

  if (loading) return <p>Loading...</p>; // optional spinner or skeleton
  if (!user) return <Navigate to="/" replace />; // redirect if not logged in

  return children;
}

function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/signup/:role" element={<Signup />} />

            {/* Protected Dashboard */}
            <Route
              path="/dashboard/:role"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;
