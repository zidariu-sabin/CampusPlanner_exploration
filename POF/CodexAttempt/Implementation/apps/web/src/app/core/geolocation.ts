/**
 * Fallback map centre (Craiova) used only when there is no campus geometry to fit
 * and the browser geolocation is unavailable or denied.
 */
export const FALLBACK_CENTER: [number, number] = [23.830052, 44.297575];

/**
 * Resolves the user's current position as `[longitude, latitude]`, or `null` if
 * geolocation is unsupported, denied, or times out. Never rejects.
 */
export function getUserLocation(timeoutMs = 6000): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 600_000 },
    );
  });
}
