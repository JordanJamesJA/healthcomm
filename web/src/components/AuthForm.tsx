import React from "react";
import { Link } from "react-router-dom";

interface AuthFormProps {
  title: string;
  subtitle?: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  buttonText: string;
}

const AuthForm: React.FC<AuthFormProps> = ({
  title,
  subtitle,
  onSubmit,
  children,
  buttonText,
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 w-full max-w-md transition-colors duration-300">
        <h1 className="text-2xl font-semibold text-center mb-2 text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
            {subtitle}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
          >
            {buttonText}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-green-600 dark:text-green-400 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
