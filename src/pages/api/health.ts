export const prerender = false;

import type { APIRoute } from "astro";
import { getHealthCheckData } from "../../lib/services/performance-monitor";
import { json } from "../../lib/http";

export const GET: APIRoute = async () => {
  try {
    const healthData = getHealthCheckData();

    return json(healthData, 200);
  } catch (error) {
    console.error("[api/health] GET failed", error);

    return json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      500
    );
  }
};
