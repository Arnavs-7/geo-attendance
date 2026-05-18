# Vercel Environment Variables Checklist

This document outlines all environment variables required for the Geo-Attendance application to function correctly in production (Vercel).

## Firebase Client Configuration
| Variable Name | Required | Format | Environments | Public? |
|--------------|----------|--------|--------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | String | All | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | URL (e.g. `*.firebaseapp.com`) | All | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | String | All | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | String (e.g. `*.appspot.com`) | All | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Numeric String | All | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | String (e.g. `1:xxx:web:xxx`) | All | Yes |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | String | Production | Yes |

## Office & Geofencing Configuration
| Variable Name | Required | Format | Environments | Public? |
|--------------|----------|--------|--------------|---------|
| `NEXT_PUBLIC_OFFICE_LAT` | Yes (Fallback) | Decimal (e.g. `12.9716`) | All | Yes |
| `NEXT_PUBLIC_OFFICE_LNG` | Yes (Fallback) | Decimal (e.g. `77.5946`) | All | Yes |
| `NEXT_PUBLIC_GEOFENCE_RADIUS_METERS` | Yes (Fallback) | Integer (e.g. `100`) | All | Yes |

## Application Meta
| Variable Name | Required | Format | Environments | Public? |
|--------------|----------|--------|--------------|---------|
| `NEXT_PUBLIC_APP_ENV` | Yes | `production` \| `development` | All | Yes |

## Firebase Admin SDK (Server-Side)

**Not used.** This app runs entirely on the Firebase Spark (free) plan with no
Cloud Functions and no Firebase Admin SDK. There are no server-side
service-account secrets to configure.

---
> [!IMPORTANT]
> **NEXT_PUBLIC_** variables are bundled into the client-side JavaScript. The
> Firebase Web API key is public *by design* — access is controlled by
> Firestore Security Rules, not by key secrecy. Never prefix a genuine secret
> with `NEXT_PUBLIC_`. This project has no such secrets.
