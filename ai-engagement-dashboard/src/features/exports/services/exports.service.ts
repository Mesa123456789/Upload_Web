// ---------------------------------------------------------------------------
// exports.service.ts — Export project data to PDF and CSV
//
// Status: STUB — functions exist so imports don't break, but not implemented.
//   Will be filled in at Step 4 (Output phase).
//
// Why stub instead of skip?
//   If UploadPage or any other component imports these functions now, the
//   TypeScript compiler will be happy. When we implement later, we just
//   replace the function body — no import changes needed anywhere.
// ---------------------------------------------------------------------------

import type { Project } from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// exportToCSV — Convert project data into a downloadable .csv file
//
// TODO (Step 4): Implement using a library like papaparse, or build manually
//   with Array.join(","). Trigger browser download via URL.createObjectURL().
// ---------------------------------------------------------------------------

export async function exportToCSV(project: Project): Promise<void> {
  // Stub — implementation coming in Step 4
  console.warn("[exports.service] exportToCSV not yet implemented", project.id);
  alert("CSV export coming soon!");
}

// ---------------------------------------------------------------------------
// exportToPDF — Convert project summary into a downloadable .pdf file
//
// TODO (Step 4): Implement using react-pdf or jsPDF.
//   Will include: project metadata, ads config, IAP config, analysis results.
// ---------------------------------------------------------------------------

export async function exportToPDF(project: Project): Promise<void> {
  // Stub — implementation coming in Step 4
  console.warn("[exports.service] exportToPDF not yet implemented", project.id);
  alert("PDF export coming soon!");
}
