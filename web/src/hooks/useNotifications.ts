/**
 * Custom React hook for managing user notifications
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  userId: string;
  type: "alert" | "invitation" | "system" | "reminder";
  severity?: "low" | "medium" | "high";
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  alertId?: string;
  invitationId?: string;
  createdAt: Timestamp;
  read: boolean;
  sent: boolean;
}

/**
 * Hook to manage user notifications with real-time updates
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to notifications for the current user
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationList: Notification[] = [];
        let unread = 0;

        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Notification, "id">;
          const notification: Notification = {
            id: doc.id,
            ...data,
          };

          notificationList.push(notification);

          if (!notification.read) {
            unread++;
          }
        });

        setNotifications(notificationList);
        setUnreadCount(unread);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch notifications"));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  /**
   * Mark a notification as read
   */
  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      throw err;
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);

      await Promise.all(
        unreadNotifications.map((notification) => {
          const notificationRef = doc(db, "notifications", notification.id);
          return updateDoc(notificationRef, {
            read: true,
          });
        })
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      throw err;
    }
  };

  /**
   * Get unread notifications
   */
  const getUnreadNotifications = () => {
    return notifications.filter((n) => !n.read);
  };

  /**
   * Get notifications by type
   */
  const getNotificationsByType = (type: Notification["type"]) => {
    return notifications.filter((n) => n.type === type);
  };

  /**
   * Get critical notifications (high severity alerts)
   */
  const getCriticalNotifications = () => {
    return notifications.filter((n) => n.type === "alert" && n.severity === "high" && !n.read);
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    getUnreadNotifications,
    getNotificationsByType,
    getCriticalNotifications,
  };
}
