import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { db } from "../services/firebase";

interface Alert extends DocumentData {
  id: string;
  // optionally add known fields if you want strict typing
  // title?: string;
  // message?: string;
}

export default function usePatientAlerts(patientId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]); // 
  useEffect(() => {
    if (!patientId) return;

    const colRef = collection(db, `patients/${patientId}/alerts`);
    const unsubscribe = onSnapshot(colRef, (snapshot) =>
      setAlerts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Alert)))
    );

    return () => unsubscribe();
  }, [patientId]);

  return alerts;
}
