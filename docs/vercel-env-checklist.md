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
| Variable Name | Required | Format | Environments | Public? |
|--------------|----------|--------|--------------|---------|
| `FIREBASE_ADMIN_PROJECT_ID` | Yes | String | Production | No |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Yes | Email | Production | No |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Yes | RSA Private Key String | Production | No |

---
> [!IMPORTANT]
> **NEXT_PUBLIC_** variables are bundled into the client-side JavaScript. Ensure no sensitive secrets (like the Admin Private Key) are ever prefixed with `NEXT_PUBLIC_`.
