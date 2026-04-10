/**
 * Calculates the Haversine distance between two sets of GPS coordinates.
 * @returns distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

export interface SpoofingCheckResult {
  isSuspicious: boolean;
  reason: string | null;
}

/**
 * Checks for potential GPS spoofing based on movement speed and repetition.
 */
export function checkSpoofing(
  currentLat: number,
  currentLng: number,
  currentTimestamp: number
): SpoofingCheckResult {
  const lastLocationStr = localStorage.getItem("last_known_location");
  const now = currentTimestamp;

  if (!lastLocationStr) {
    localStorage.setItem(
      "last_known_location",
      JSON.stringify({
        lat: currentLat,
        lng: currentLng,
        timestamp: now,
        consecutiveReads: 1,
      })
    );
    return { isSuspicious: false, reason: null };
  }

  const lastLocation = JSON.parse(lastLocationStr);
  const distance = haversineDistance(
    lastLocation.lat,
    lastLocation.lng,
    currentLat,
    currentLng
  );
  const timeDiff = (now - lastLocation.timestamp) / 1000; // in seconds

  // Check 1: Impossible Speed (> 500m in < 10s)
  if (timeDiff > 0 && timeDiff < 10 && distance > 500) {
    return {
      isSuspicious: true,
      reason: "Impossible movement speed detected",
    };
  }

  // Check 2: Mock GPS (Exact same coordinates for 3+ consecutive reads)
  const isExactlySame =
    lastLocation.lat.toFixed(10) === currentLat.toFixed(10) &&
    lastLocation.lng.toFixed(10) === currentLng.toFixed(10);

  let consecutiveReads = isExactlySame ? (lastLocation.consecutiveReads || 1) + 1 : 1;

  localStorage.setItem(
    "last_known_location",
    JSON.stringify({
      lat: currentLat,
      lng: currentLng,
      timestamp: now,
      consecutiveReads,
    })
  );

  if (consecutiveReads >= 3) {
    return {
      isSuspicious: true,
      reason: "Possible mock GPS detected (static coordinates)",
    };
  }

  return { isSuspicious: false, reason: null };
}
