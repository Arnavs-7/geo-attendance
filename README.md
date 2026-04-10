# Geo-Attendance System

A production-ready, full-stack geo-fencing attendance system built with Next.js 14 and Firebase.

## Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore + Authentication)
- **Deployment**: Vercel (frontend) + Firebase (backend)
- **Geofencing**: Haversine Formula (client-side)
- **Security**: Firestore Security Rules + Anti-spoofing logic

## Setup Instructions

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd geo-attendance
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Firebase**:
    - Create a new project in [Firebase Console](https://console.firebase.google.com/).
    - Enable **Authentication** (Email/Password).
    - Enable **Cloud Firestore**.
    - Create a Web App and copy the config variables.

4.  **Environment Variables**:
    - Create a `.env.local` file based on `.env.example`.
    - Fill in your Firebase configuration.
    - Set the default office latitude, longitude, and radius.

5.  **Firestore Security Rules**:
    - Deploy the rules from `firestore.rules` to your Firebase project.

6.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Geofencing Logic

The system uses the **Haversine formula** to calculate the distance between the user's current GPS coordinates and the configured office location.

- **High Accuracy**: Always requests high-accuracy GPS (`enableHighAccuracy: true`).
- **GPS Accuracy Handling**: 
  - Accuracy > 50m: Warn user but allow check-in.
  - Accuracy > 200m: Block check-in.
- **Anti-Spoofing**:
  - Detects impossible movement speed (>500m in <10s).
  - Detects mock GPS by checking for static coordinates across multiple reads.

## Admin Setup

To set up an admin user:
1. Sign up as a regular employee.
2. Manually change the `role` field in the `users` collection to `admin` in the Firebase Console.
3. Refresh the app to see the Admin Dashboard.

## Known Limitations

- **Free Tier**: This project is optimized for the Firebase Spark plan (no Cloud Functions).
- **Client-Side Logic**: Due to free tier limits, some logic is handled on the client-side.
- **Browser Compatibility**: Geolocation requires HTTPS and user permission.

## Known Edge Cases

- **Battery Optimization**: Some mobile browsers may throttle location updates in the background.
- **Indoor Accuracy**: GPS accuracy may be poor indoors. Users are advised to move near windows or open areas.
- **Server Timestamp Drift**: Security rules enforce server timestamps to prevent client-side time manipulation.

## Deployment

1.  **Vercel**: Connect your GitHub repo to Vercel.
2.  **Environment Variables**: Add all `NEXT_PUBLIC_*` variables in Vercel settings.
3.  **Firebase**: The frontend interacts directly with Firebase. No separate backend deployment is needed.
