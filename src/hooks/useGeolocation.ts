"use client";

import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (options?: PositionOptions) => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
  });

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMsg = "Failed to get location";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please enable it in browser settings.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Please try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        }
        setState({
          coords: null,
          error: errorMsg,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options,
      }
    );
  }, [options]);

  useEffect(() => {
    getPosition();
    const interval = setInterval(getPosition, 10000); // Update every 10s as requested
    return () => clearInterval(interval);
  }, [getPosition]);

  return { ...state, refetch: getPosition };
};
