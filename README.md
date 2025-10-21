# HealthComm

HealthComm is a healthcare application designed to **monitor and analyze patient vitals (e.g., glucose, blood pressure, heart rate) in real-time**. The platform supports three main user roles — **Medical Professional, Patient, and Caretaker** — and provides **predictive insights using AI** to preempt medical crises.

This repository contains the **initial mono-repo skeleton** for HealthComm, structured for **scalability, collaboration, and future integration with real-time services like Kafka/WebSockets and Azure Anomaly Detection**.

---

## **Table of Contents**

- [Features](#features)
- [Folder Structure](#folder-structure)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [Running the Project](#running-the-project)
- [Next Steps](#next-steps)
- [Contributing](#contributing)

---

## **Features in This Skeleton**

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend Bridge:** Prepared for Kafka/WebSocket integration for real-time vitals
- **Firebase Functions:** Authentication, notifications, and future serverless logic
- **Infra Folder:** Deployment scripts and placeholders for Docker/Kafka setup
- **Folder structure optimized** for 2–3 developers working collaboratively

---
## **Requirements**

- **Node.js** v22.x or higher
- **npm** v11.x or higher
- Git and GitHub Desktop (for version control)
- Optional (for later stages): Docker and WSL2 for Kafka testing

---

## **Installation & Setup**

### **1. Clone the Repository**

```bash
git clone <your-repo-url>
cd healthcomm
2. Frontend Setup
bash
Copy code
cd web
npm install --legacy-peer-deps
3. Install Essential Frontend Packages
bash
Copy code
npm install react-router-dom firebase recharts --legacy-peer-deps
4. Optional UI Enhancements
bash
Copy code
npm install @headlessui/react @heroicons/react --legacy-peer-deps
5. Tailwind Setup
bash
Copy code
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
Ensure web/src/index.css contains:

css
Copy code
@tailwind base;
@tailwind components;
@tailwind utilities;
6. Running the Frontend
bash
Copy code
npm run dev
Open the URL shown (usually http://localhost:5173)

Backend & Functions
bridge/ folder is ready for real-time vitals processing and Kafka/WebSocket integration

functions/ folder is ready for Firebase auth, notifications, and serverless functions

.env files must be created with your Firebase and Azure credentials

Next Steps
Connect frontend to Firebase Auth & Firestore

Simulate real-time vitals in the bridge backend

Build role-based dashboards for Patient, Caretaker, and Medical Professional

Add charts and analytics using Recharts

Integrate Azure Anomaly Detection API for predictive alerts

Setup Docker/Kafka for live testing

Contributing
Create a branch for your feature:

bash
Copy code
git checkout -b feature/your-feature-name
Commit changes with descriptive messages

Push branch and open a pull request to main

Use .gitignore to exclude node_modules, .env, and dist

This README sets a clear roadmap for the dev team and ensures installation is straightforward on any Windows or Mac machine.
```
