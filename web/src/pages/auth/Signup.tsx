import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import AuthForm from "../../components/AuthForm";
import InputField from "../../components/InputField";
import SelectField from "../../components/SelectField";
import MultiSelectField from "../../components/MultiSelectField";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  password: string;

  // Patient
  bloodType?: string;
  knownAllergies?: string;
  chronicConditions?: string[];
  emergencyContact?: string;

  // Caretaker
  relationshipToPatient?: string;
  assignedPatientEmail?: string;
  experienceYears?: string;
  certified?: boolean;

  // Medical
  specialization?: string;
  yearsInPractice?: string;
  hospitalAffiliation?: string;
  licenseId?: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    password: "",
  });

  const [chronicConditions, setChronicConditions] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement; 
    const { name, type, value, checked } = target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    try {
      const { email, password, ...profile } = formData;

      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCred.user.uid;

      // Create user profile in Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        role,
        ...profile,
        chronicConditions,
        emailVerified: false,
        createdAt: serverTimestamp(),
      });

      // Send email verification
      try {
        await sendEmailVerification(userCred.user, {
          url: `${window.location.origin}/dashboard/${role}`,
          handleCodeInApp: false,
        });

        alert("Account created! Please check your email to verify your account before logging in.");
        navigate("/login");
      } catch (emailError) {
        console.warn("Failed to send verification email:", emailError);
        // Still allow user to proceed even if email fails
        alert("Account created! You can now log in, but please verify your email later.");
        navigate(`/dashboard/${role}`);
      }
    } catch (err: unknown) {
      // Type guard
      if (err instanceof Error) {
        console.error("Signup error:", err.message);
        alert(err.message);
      } else {
        console.error("Signup error:", err);
        alert("An unknown error occurred");
      }
    }
  };

  const renderRoleFields = () => {
    switch (role) {
      case "patient":
        return (
          <>
            <SelectField
              label="Blood Type"
              name="bloodType"
              value={formData.bloodType || ""}
              onChange={handleChange}
              options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
            />
            <InputField
              label="Known Allergies"
              name="knownAllergies"
              value={formData.knownAllergies || ""}
              onChange={handleChange}
              placeholder="Peanuts, Shellfish..."
            />
            <MultiSelectField
              label="Chronic Conditions"
              options={[
                "Sickle Cell",
                "Sickle Trait",
                "Type I Diabetes",
                "Type II Diabetes",
                "Hypertension",
              ]}
              selected={chronicConditions}
              onChange={setChronicConditions}
            />
            <InputField
              label="Emergency Contact"
              name="emergencyContact"
              value={formData.emergencyContact || ""}
              onChange={handleChange}
            />
          </>
        );

      case "caretaker":
        return (
          <>
            <SelectField
              label="Relationship to Patient"
              name="relationshipToPatient"
              value={formData.relationshipToPatient || ""}
              onChange={handleChange}
              options={[
                "Parent",
                "Sibling",
                "Spouse",
                "Friend",
                "Professional Caretaker",
              ]}
            />
            <InputField
              label="Assigned Patient Email"
              name="assignedPatientEmail"
              value={formData.assignedPatientEmail || ""}
              onChange={handleChange}
            />
            <InputField
              label="Years of Experience"
              type="number"
              name="experienceYears"
              value={formData.experienceYears || ""}
              onChange={handleChange}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="certified"
                name="certified"
                checked={formData.certified || false}
                onChange={handleChange}
              />
              <label htmlFor="certified" className="text-gray-700">
                Certified Caretaker
              </label>
            </div>
          </>
        );

      case "medical":
        return (
          <>
            <InputField
              label="Specialization"
              name="specialization"
              value={formData.specialization || ""}
              onChange={handleChange}
              placeholder="Cardiologist, Endocrinologist..."
            />
            <InputField
              label="Years in Practice"
              type="number"
              name="yearsInPractice"
              value={formData.yearsInPractice || ""}
              onChange={handleChange}
            />
            <InputField
              label="Hospital Affiliation"
              name="hospitalAffiliation"
              value={formData.hospitalAffiliation || ""}
              onChange={handleChange}
            />
            <InputField
              label="License ID"
              name="licenseId"
              value={formData.licenseId || ""}
              onChange={handleChange}
            />
          </>
        );

      default:
        return <p className="text-red-500">Invalid role specified.</p>;
    }
  };

  const capitalize = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  return (
    <AuthForm
      title={`Sign Up as ${capitalize(role)}`}
      onSubmit={handleSubmit}
      buttonText="Create Account"
    >
      <InputField
        label="First Name"
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
      />
      <InputField
        label="Last Name"
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
      />
      <InputField
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
      />
      <InputField
        label="Date of Birth"
        type="date"
        name="dateOfBirth"
        value={formData.dateOfBirth}
        onChange={handleChange}
      />
      <InputField
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
      />

      {renderRoleFields()}
    </AuthForm>
  );
};

export default Signup;
