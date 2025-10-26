import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { updateDoc, doc } from "firebase/firestore";
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "../../services/firebase";
import DashboardHeader from "../../components/DashboardHeader";
import InputField from "../../components/InputField";
import SelectField from "../../components/SelectField";
import MultiSelectField from "../../components/MultiSelectField";
import DeviceManagement from "../../components/DeviceManagement";
import { useDarkMode } from "../../contexts/useDarkMode";
import { FaSave, FaUserCog, FaBell, FaMoon, FaLaptopMedical, FaUserMd, FaUsers, FaChartLine } from "react-icons/fa";
import type { AppUser } from "../../contexts/AuthTypes";

export default function Settings() {
  const { user, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "theme" | "devices" | "role-specific">("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    dateOfBirth: user?.dateOfBirth || "",
    bloodType: user?.bloodType || "",
    knownAllergies: user?.knownAllergies || "",
    emergencyContact: (user as any)?.emergencyContact || "",

    // Patient-specific
    chronicConditions: (user as any)?.chronicConditions || [],

    // Caretaker-specific
    relationshipToPatient: (user as any)?.relationshipToPatient || "",
    experienceYears: (user as any)?.experienceYears || "",
    certified: (user as any)?.certified || false,

    // Medical-specific
    specialization: (user as any)?.specialization || "",
    yearsInPractice: (user as any)?.yearsInPractice || "",
    hospitalAffiliation: (user as any)?.hospitalAffiliation || "",
    licenseId: (user as any)?.licenseId || "",
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        dateOfBirth: user.dateOfBirth || "",
        bloodType: user.bloodType || "",
        knownAllergies: user.knownAllergies || "",
        emergencyContact: (user as any).emergencyContact || "",
        chronicConditions: (user as any).chronicConditions || [],
        relationshipToPatient: (user as any).relationshipToPatient || "",
        experienceYears: (user as any).experienceYears || "",
        certified: (user as any).certified || false,
        specialization: (user as any).specialization || "",
        yearsInPractice: (user as any).yearsInPractice || "",
        hospitalAffiliation: (user as any).hospitalAffiliation || "",
        licenseId: (user as any).licenseId || "",
      });

      // Load notification preferences if they exist
      if ((user as any).notificationPreferences) {
        setNotifications((user as any).notificationPreferences);
      }
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, type, value, checked } = target;

    setProfileData({
      ...profileData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications({
      ...notifications,
      [e.target.name]: e.target.checked,
    });
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const userDocRef = doc(db, "users", user.uid);

      // Update Firestore user document
      await updateDoc(userDocRef, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        dateOfBirth: profileData.dateOfBirth,
        bloodType: profileData.bloodType,
        knownAllergies: profileData.knownAllergies,
        emergencyContact: profileData.emergencyContact,
        ...(user.role === "patient" && {
          chronicConditions: profileData.chronicConditions,
        }),
        ...(user.role === "caretaker" && {
          relationshipToPatient: profileData.relationshipToPatient,
          experienceYears: profileData.experienceYears,
          certified: profileData.certified,
        }),
        ...(user.role === "medical" && {
          specialization: profileData.specialization,
          yearsInPractice: profileData.yearsInPractice,
          hospitalAffiliation: profileData.hospitalAffiliation,
          licenseId: profileData.licenseId,
        }),
      });

      // Update email if changed
      if (profileData.email !== user.email && auth.currentUser) {
        await updateEmail(auth.currentUser, profileData.email);
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: error.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!auth.currentUser || !user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email || "",
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Password updated successfully!" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      setMessage({ type: "error", text: error.message || "Failed to update password" });
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        notificationPreferences: notifications,
      });

      setMessage({ type: "success", text: "Notification preferences saved!" });
    } catch (error: any) {
      console.error("Error saving notifications:", error);
      setMessage({ type: "error", text: "Failed to save notification preferences" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader />

        {/* Back to Dashboard Button */}
        <button
          onClick={() => navigate(`/dashboard/${user.role}`)}
          className="mb-6 text-green-600 dark:text-green-400 hover:underline flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        <h2 className="text-3xl font-bold mb-8 dark:text-white">Settings</h2>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-green-600 text-green-600 dark:text-green-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <FaUserCog /> Profile
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "notifications"
                ? "border-green-600 text-green-600 dark:text-green-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <FaBell /> Notifications
          </button>
          <button
            onClick={() => setActiveTab("theme")}
            className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "theme"
                ? "border-green-600 text-green-600 dark:text-green-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <FaMoon /> Theme
          </button>
          {user.role === "patient" && (
            <button
              onClick={() => setActiveTab("devices")}
              className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "devices"
                  ? "border-green-600 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <FaLaptopMedical /> Devices
            </button>
          )}
          <button
            onClick={() => setActiveTab("role-specific")}
            className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "role-specific"
                ? "border-green-600 text-green-600 dark:text-green-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {user.role === "patient" && <FaUserMd />}
            {user.role === "caretaker" && <FaUsers />}
            {user.role === "medical" && <FaChartLine />}
            {user.role === "patient" && "Care Team"}
            {user.role === "caretaker" && "Patients"}
            {user.role === "medical" && "Professional"}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold mb-6 dark:text-white">Profile Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="First Name"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                  required={false}
                />
                <InputField
                  label="Last Name"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  required={false}
                />
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required={false}
                />
                <InputField
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={handleProfileChange}
                  required={false}
                />
                <SelectField
                  label="Blood Type"
                  name="bloodType"
                  value={profileData.bloodType}
                  onChange={handleProfileChange}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  required={false}
                />
                <InputField
                  label="Known Allergies"
                  name="knownAllergies"
                  value={profileData.knownAllergies}
                  onChange={handleProfileChange}
                  placeholder="e.g., Penicillin, Peanuts"
                  required={false}
                />
              </div>

              {user.role === "patient" && (
                <>
                  <InputField
                    label="Emergency Contact"
                    name="emergencyContact"
                    value={profileData.emergencyContact}
                    onChange={handleProfileChange}
                    placeholder="Phone number or email"
                    required={false}
                  />
                  <MultiSelectField
                    label="Chronic Conditions"
                    selected={profileData.chronicConditions}
                    onChange={(conditions) =>
                      setProfileData({ ...profileData, chronicConditions: conditions })
                    }
                    options={[
                      "Diabetes",
                      "Hypertension",
                      "Asthma",
                      "Heart Disease",
                      "Arthritis",
                      "Cancer",
                      "COPD",
                      "Kidney Disease",
                    ]}
                  />
                </>
              )}

              {user.role === "caretaker" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Relationship to Patient"
                    name="relationshipToPatient"
                    value={profileData.relationshipToPatient}
                    onChange={handleProfileChange}
                    placeholder="e.g., Spouse, Child, Professional"
                    required={false}
                  />
                  <InputField
                    label="Years of Experience"
                    name="experienceYears"
                    type="number"
                    value={profileData.experienceYears}
                    onChange={handleProfileChange}
                    required={false}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="certified"
                      name="certified"
                      checked={profileData.certified}
                      onChange={handleProfileChange}
                      className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="certified" className="text-gray-700 dark:text-gray-300">
                      Certified Caretaker
                    </label>
                  </div>
                </div>
              )}

              {user.role === "medical" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Specialization"
                    name="specialization"
                    value={profileData.specialization}
                    onChange={handleProfileChange}
                    placeholder="e.g., Cardiology, Family Medicine"
                    required={false}
                  />
                  <InputField
                    label="Years in Practice"
                    name="yearsInPractice"
                    type="number"
                    value={profileData.yearsInPractice}
                    onChange={handleProfileChange}
                    required={false}
                  />
                  <InputField
                    label="Hospital Affiliation"
                    name="hospitalAffiliation"
                    value={profileData.hospitalAffiliation}
                    onChange={handleProfileChange}
                    required={false}
                  />
                  <InputField
                    label="License ID"
                    name="licenseId"
                    value={profileData.licenseId}
                    onChange={handleProfileChange}
                    required={false}
                  />
                </div>
              )}

              <button
                onClick={saveProfile}
                disabled={saving}
                className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FaSave /> {saving ? "Saving..." : "Save Profile"}
              </button>

              {/* Password Change Section */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-semibold mb-6 dark:text-white">Change Password</h3>
                <div className="grid grid-cols-1 gap-6 max-w-md">
                  <InputField
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required={false}
                  />
                  <InputField
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required={false}
                  />
                  <InputField
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required={false}
                  />
                </div>
                <button
                  onClick={savePassword}
                  disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
                  className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaSave /> {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold mb-6 dark:text-white">Notification Preferences</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose how you want to receive notifications about health alerts, updates, and messages.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-semibold dark:text-white">Email Notifications</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="email"
                      checked={notifications.email}
                      onChange={handleNotificationChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-semibold dark:text-white">Push Notifications</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="push"
                      checked={notifications.push}
                      onChange={handleNotificationChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-semibold dark:text-white">SMS Notifications</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive text message notifications
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="sms"
                      checked={notifications.sms}
                      onChange={handleNotificationChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              <button
                onClick={saveNotifications}
                disabled={saving}
                className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FaSave /> {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === "theme" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold mb-6 dark:text-white">Theme Settings</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Customize the appearance of HealthComm to suit your preferences.
              </p>

              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-semibold text-lg dark:text-white">Dark Mode</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {darkMode ? "Dark theme is currently active" : "Light theme is currently active"}
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FaMoon /> {darkMode ? "Switch to Light" : "Switch to Dark"}
                </button>
              </div>
            </div>
          )}

          {/* Devices Tab (Patient only) */}
          {activeTab === "devices" && user.role === "patient" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold mb-6 dark:text-white">Device Management</h3>
              <DeviceManagement />
            </div>
          )}

          {/* Role-Specific Tab */}
          {activeTab === "role-specific" && (
            <div className="space-y-6">
              {user.role === "patient" && <PatientRoleSettings user={user} />}
              {user.role === "caretaker" && <CaretakerRoleSettings />}
              {user.role === "medical" && <MedicalRoleSettings />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Patient-specific role settings
function PatientRoleSettings({ user }: { user: AppUser }): JSX.Element {
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 dark:text-white">Care Team & Permissions</h3>

      {/* Connected Care Team */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Your Care Team</h4>
        <div className="space-y-3">
          {user.assignedDoctor && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaUserMd className="text-green-600 dark:text-green-400 text-xl" />
                <div>
                  <p className="font-medium dark:text-white">{user.assignedDoctor}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Medical Professional</p>
                </div>
              </div>
              <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
            </div>
          )}

          {(user as any).assignedCaretakerId && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaUsers className="text-green-600 dark:text-green-400 text-xl" />
                <div>
                  <p className="font-medium dark:text-white">Caretaker</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Caretaker</p>
                </div>
              </div>
              <button className="text-red-600 hover:text-red-700 text-sm">Remove</button>
            </div>
          )}

          {!user.assignedDoctor && !(user as any).assignedCaretakerId && (
            <p className="text-gray-600 dark:text-gray-400 italic">No care team members assigned yet</p>
          )}
        </div>

        <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
          + Request Care Team Member
        </button>
      </div>

      {/* Health Data Permissions */}
      <div>
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Health Data Permissions</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Control which vitals your care team can access
        </p>

        <div className="space-y-2">
          {["Heart Rate", "Blood Pressure", "Oxygen Level", "Temperature", "Glucose", "Respiration"].map((vital) => (
            <div key={vital} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="dark:text-white">{vital}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Caretaker-specific role settings
function CaretakerRoleSettings(): JSX.Element {
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 dark:text-white">Patient Management</h3>

      {/* Assigned Patients */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Assigned Patients</h4>
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 italic">
              No patients assigned yet. Patient requests will appear here.
            </p>
          </div>
        </div>
      </div>

      {/* Patient Requests */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Patient Requests</h4>
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 italic">No pending requests</p>
          </div>
        </div>
      </div>

      {/* Communication Log */}
      <div>
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Communication Log</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 italic">No recent communications</p>
        </div>
      </div>
    </div>
  );
}

// Medical professional-specific role settings
function MedicalRoleSettings(): JSX.Element {
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 dark:text-white">Professional Dashboard</h3>

      {/* Patient Overview */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Patient Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Patients</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">0</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">0</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Critical Cases</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">0</p>
          </div>
        </div>
      </div>

      {/* Caretaker Collaborations */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Caretaker Collaborations</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
          <p className="text-gray-600 dark:text-gray-400 italic">No active collaborations</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
          + Request Caretaker Collaboration
        </button>
      </div>

      {/* Advanced Analytics */}
      <div>
        <h4 className="text-lg font-semibold mb-4 dark:text-white">Advanced Analytics</h4>
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
          <FaChartLine className="text-4xl text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            View patient trends, anomaly summaries, and health insights
          </p>
        </div>
      </div>
    </div>
  );
}
