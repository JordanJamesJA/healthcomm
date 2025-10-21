import type { FC } from "react";
import Navbar from "../components/Navbar";
import RoleCard from "../components/RoleCard";
import { Stethoscope, HeartPulse, Users } from "lucide-react";

const Home: FC = () => {
  return (
    <div>
      <Navbar />
      <section className="text-center px-6 py-16">
        <div className="flex justify-center mb-4">
          <HeartPulse size={36} className="text-green-600" />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Advanced Health Monitoring Platform
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-10">
          Monitor glucose, hypertension, and vital signs with real-time data for
          patients, medical professionals, and caretakers.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <RoleCard
            icon={<Stethoscope size={28} />}
            title="Medical Professional"
            description="Monitor and care for multiple patients with comprehensive health data."
            buttonText="Sign Up as Doctor"
          />
          <RoleCard
            icon={<HeartPulse size={28} />}
            title="Patient"
            description="Track your vital signs and connect with healthcare providers."
            buttonText="Sign Up as Patient"
          />
          <RoleCard
            icon={<Users size={28} />}
            title="Caretaker"
            description="Stay informed about your loved ones' health status in real-time."
            buttonText="Sign Up as Caretaker"
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
