import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

export interface FeatureDefinition {
  key: string;
  type: string;
  showInSearch: boolean;
  labels: Record<string, string>;
}

export function useFeatureDefinitions() {
  return useQuery({
    queryKey: ["feature-definitions"],
    queryFn: () => apiClient.get<Record<string, FeatureDefinition[]>>("/features"),
    staleTime: 10 * 60_000,
  });
}
