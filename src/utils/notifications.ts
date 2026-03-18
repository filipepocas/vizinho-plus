// src/utils/notifications.ts
import { getToken } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BGr_m2fI97rE8O7M6Z4-8v-k-ZzQy_O-y-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z-z" // Replace with your actual VAPID key if needed
      });
      
      if (token) {
        console.log("FCM Token:", token);
        // Save token to user document
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
      }
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
  }
};
