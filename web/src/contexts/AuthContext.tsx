import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseAuthUser,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import type { AppUser, AuthContextValue } from "../contexts/AuthTypes";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(
    null
  );
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        unsubUserDoc = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as AppUser;
              setUser({ ...(data || {}), uid: fbUser.uid });
            } else {
              setUser({ uid: fbUser.uid, email: fbUser.email ?? undefined });
            }
            setLoading(false);
          },
          (error) => {
            console.error("Failed to listen to user document", error);
            setUser({ uid: fbUser.uid, email: fbUser.email ?? undefined });
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Failed to fetch user profile", err);
        setUser({ uid: fbUser.uid, email: fbUser.email ?? undefined });
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubUserDoc?.();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out", err);
    } finally {
      setUser(null);
      setFirebaseUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
