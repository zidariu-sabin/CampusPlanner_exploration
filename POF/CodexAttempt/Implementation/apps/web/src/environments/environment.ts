type RuntimeEnvironment = {
  apiBaseUrl?: string;
  mapboxAccessToken?: string;
  mapboxStyleUrl?: string;
};

declare global {
  var __CAMPUS_PLANNER_ENV__: RuntimeEnvironment | undefined;
}

const runtimeEnvironment = globalThis.__CAMPUS_PLANNER_ENV__ ?? {};

export const environment = {
  apiBaseUrl: runtimeEnvironment.apiBaseUrl ?? 'http://localhost:3000',
  mapboxAccessToken: runtimeEnvironment.mapboxAccessToken ?? '',
  mapboxStyleUrl: runtimeEnvironment.mapboxStyleUrl ?? 'mapbox://styles/mapbox/standard-satellite',
};
