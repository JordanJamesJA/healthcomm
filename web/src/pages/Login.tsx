import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import {
  FaHeartbeat,
  FaEnvelope,
  FaLock,
  FaExclamationCircle,
} from "react-icons/fa";
import type { FormEvent } from "react";
interface LoginError {
  message: string;
  field?: "email" | "password" | "general";
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  const validateForm = (): boolean => {
    // Email validation
    if (!email.trim()) {
      setError({ message: "Email is required", field: "email" });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError({
        message: "Please enter a valid email address",
        field: "email",
      });
      return false;
    }

    // Password validation
    if (!password) {
      setError({ message: "Password is required", field: "password" });
      return false;
    }

    if (password.length < 6) {
      setError({
        message: "Password must be at least 6 characters",
        field: "password",
      });
      return false;
    }

    return true;
  };

  const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password. Please try again.";
      case "auth/invalid-email":
        return "Invalid email address format.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/too-many-requests":
        return "Too many failed login attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      default:
        return "An error occurred during login. Please try again.";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      // Fetch user profile from Firestore
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError({
          message: "User profile not found. Please complete registration.",
          field: "general",
        });
        await auth.signOut();
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      // Validate role exists
      if (!role || !["patient", "caretaker", "medical"].includes(role)) {
        setError({
          message: "Invalid user role. Please contact support.",
          field: "general",
        });
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Successful login - navigate to role-specific dashboard
      navigate(`/dashboard/${role}`, { replace: true });
    } catch (err: unknown) {
      setLoading(false);

      if (err && typeof err === "object" && "code" in err) {
        const errorCode = (err as { code: string }).code;
        setError({
          message: getFirebaseErrorMessage(errorCode),
          field: "general",
        });
      } else {
        setError({
          message: "An unexpected error occurred. Please try again.",
          field: "general",
        });
      }

      console.error("Login error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 w-full max-w-md transition-colors duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
              <FaHeartbeat className="text-green-600 dark:text-green-400 text-4xl" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to access your HealthComm dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && error.field === "general" && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <FaExclamationCircle className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {error.message}
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error?.field === "email") setError(null);
                }}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 dark:bg-gray-700 dark:text-white ${
                  error?.field === "email"
                    ? "border-red-500 dark:border-red-600 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-green-500"
                }`}
                disabled={loading}
              />
            </div>
            {error?.field === "email" && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error?.field === "password") setError(null);
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 dark:bg-gray-700 dark:text-white ${
                  error?.field === "password"
                    ? "border-red-500 dark:border-red-600 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-green-500"
                }`}
                disabled={loading}
              />
            </div>
            {error?.field === "password" && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/"
              className="text-green-600 dark:text-green-400 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
