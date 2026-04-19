"use client";

import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  city: string | null;
  state: string | null;
  loading: boolean;
  error: string | null;
  manualMode: boolean;
  setManualLocation: (city: string, state: string) => void;
}

export function useGeolocation(): GeolocationState {
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en-US,en" } }
      );
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      const resolvedCity =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        null;
      const resolvedState = data.address?.state || null;
      setCity(resolvedCity);
      setState(resolvedState);
    } catch {
      setError("Could not resolve your location.");
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      setManualMode(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => reverseGeocode(pos.coords.latitude, pos.coords.longitude),
      () => {
        setError("Location access denied.");
        setManualMode(true);
        setLoading(false);
      },
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, [reverseGeocode]);

  const setManualLocation = useCallback((newCity: string, newState: string) => {
    setCity(newCity);
    setState(newState);
    setManualMode(false);
    setError(null);
    setLoading(false);
  }, []);

  return { city, state, loading, error, manualMode, setManualLocation };
}
