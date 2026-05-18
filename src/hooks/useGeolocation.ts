"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type GeolocationErrorCode =
  | "unsupported"
  | "denied"
  | "timeout"
  | "unavailable"
  | null;

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  coords: GeolocationCoords | null;
  error: string | null;
  errorCode: GeolocationErrorCode;
  loading: boolean;
}

/** GPS request timeout — kept above 10s per the retry-handling requirement. */
const GPS_TIMEOUT_MS = 12000;
/** Background refresh interval once a fix has been obtained. */
const POLL_INTERVAL_MS = 20000;

/**
 * Geolocation hook with graceful handling for unsupported browsers, denied
 * permission and GPS timeouts. Polling stops on hard errors (unsupported /
 * denied) so we don't spam the user; `refetch` powers an explicit retry.
 */
export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    errorCode: null,
    loading: true,
  });

  // Hard errors should halt the background poll.
  const pollingHaltedRef = useRef(false);

  const getPosition = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      pollingHaltedRef.current = true;
      setState({
        coords: null,
        error:
          "This browser does not support location access. Please use a modern browser (Chrome, Safari, Firefox).",
        errorCode: "unsupported",
        loading: false,
      });
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        pollingHaltedRef.current = false;
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          errorCode: null,
          loading: false,
        });
      },
      (error) => {
        let message = "Failed to get your location. Please try again.";
        let code: GeolocationErrorCode = "unavailable";

        if (error.code === error.PERMISSION_DENIED) {
          code = "denied";
          message =
            "Location permission denied. Enable location for this site in your browser settings, then retry.";
          pollingHaltedRef.current = true;
        } else if (error.code === error.TIMEOUT) {
          code = "timeout";
          message =
            "Getting your location took too long. Move to an open area and retry.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          code = "unavailable";
          message =
            "Your location is currently unavailable. Check that GPS / location services are on.";
        }

        setState({ coords: null, error: message, errorCode: code, loading: false });
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    getPosition();
    const interval = setInterval(() => {
      if (!pollingHaltedRef.current) getPosition();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [getPosition]);

  return { ...state, refetch: getPosition };
};
