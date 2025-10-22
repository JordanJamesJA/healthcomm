import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/auth/Signup";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<Home />} />

          {/* Signup */}
          <Route path="/signup/:role" element={<Signup />} />

          {/* You can add login/dashboard routes later */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
