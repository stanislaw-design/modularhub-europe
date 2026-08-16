import { plotAnalysisResults } from "./fixtures/plot-analysis";
import type { PlotAnalysisResult } from "./types";

// Every current Project.id has a fixture row (see fixtures/plot-analysis.ts);
// null only guards a future project added without a matching row. Per spec
// 0006's API surface table, a caller with no fixture match should present a
// generic "blocked" outcome, never an error, so PlotAnalysisRow supplies that
// fallback rather than baking it in here.
export async function getPlotAnalysisResult(projectId: string): Promise<PlotAnalysisResult | null> {
  const match = plotAnalysisResults.find((row) => row.projectId === projectId);
  return match ?? null;
}
