"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { Sensor } from "@/lib/sensors";

export const farmerSensorsQueryKey = (farmerId: string) =>
  ["farmers", farmerId, "sensors"] as const;

/** A farmer's registered sensors (GET /farmers/:id/sensors). */
export function useFarmerSensors(farmerId: string) {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: farmerSensorsQueryKey(farmerId),
    queryFn: () => apiFetch<Sensor[]>(`/farmers/${farmerId}/sensors`),
    enabled: isHydrated && !!token && !!farmerId,
    staleTime: 30_000,
  });
}
