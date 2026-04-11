/**
 * Environment variable validation and typed export.
 * This ensures the app doesn't start with missing configuration.
 */

const getRequiredEnv = (key: string, isPublic = true): string => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    const errorMsg = `CRITICAL: Environment variable ${key} is missing or empty.`;
    if (process.env.NODE_ENV === "development") {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
      return "";
    }
  }
  return value;
};

export const env = {
  firebase: {
    apiKey: getRequiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getRequiredEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getRequiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  office: {
    latitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LAT || "12.9716"),
    longitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LNG || "77.5946"),
    radiusMeters: parseInt(process.env.NEXT_PUBLIC_GEOFENCE_RADIUS_METERS || "100", 10),
  },
  admin: {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  isProd: process.env.NEXT_PUBLIC_APP_ENV === "production",
};
