import { exportReadiness } from "./fixtures/export-readiness";
import type { ExportReadinessCountryStatus } from "./types";

export async function getExportReadiness(): Promise<ExportReadinessCountryStatus[]> {
  return exportReadiness;
}
