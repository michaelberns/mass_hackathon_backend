import type { JobFilterParams, JobStatusFilter } from "@/types";

const VALID_STATUS_FILTERS: JobStatusFilter[] = ["open", "reserved", "closed", "all"];

/**
 * Parse and validate query params for job filtering.
 * Invalid values are ignored (e.g. non-numeric minBudget).
 * status: "open" | "reserved" | "closed" | "all"; invalid or missing → "all".
 * Example: ?status=open&minBudget=50&maxBudget=300&skills=plumbing,repair&q=sink&location=London
 */
export function parseJobFilters(searchParams: URLSearchParams): JobFilterParams {
  const filters: JobFilterParams = {};

  const statusParam = searchParams.get("status");
  if (statusParam != null && typeof statusParam === "string") {
    const s = statusParam.trim().toLowerCase();
    if (VALID_STATUS_FILTERS.includes(s as JobStatusFilter)) filters.status = s as JobStatusFilter;
  }
  // default: no filters.status means "all" (handled in service)

  const minBudget = searchParams.get("minBudget");
  if (minBudget != null && minBudget !== "") {
    const n = Number(minBudget);
    if (!Number.isNaN(n) && n >= 0) filters.minBudget = n;
  }

  const maxBudget = searchParams.get("maxBudget");
  if (maxBudget != null && maxBudget !== "") {
    const n = Number(maxBudget);
    if (!Number.isNaN(n) && n >= 0) filters.maxBudget = n;
  }

  const q = searchParams.get("q");
  if (q != null && typeof q === "string" && q.trim() !== "") filters.q = q.trim();

  const location = searchParams.get("location");
  if (location != null && typeof location === "string" && location.trim() !== "")
    filters.location = location.trim();

  const skillsParam = searchParams.get("skills");
  if (skillsParam != null && typeof skillsParam === "string" && skillsParam.trim() !== "") {
    const skills = skillsParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (skills.length > 0) filters.skills = Array.from(new Set(skills));
  }

  return filters;
}

/** Job-like shape required for filtering (budget as string, skills as string or parsed array) */
export interface JobForFilter {
  budget: string;
  title: string;
  description: string;
  location: string;
  skills: string | null;
}

function parseJobSkills(skills: string | null): string[] {
  if (skills == null || skills === "") return [];
  try {
    const arr = JSON.parse(skills) as unknown;
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string").map((s) => s.toLowerCase()) : [];
  } catch {
    return [];
  }
}

/**
 * Returns true if the job matches all provided filters.
 * - minBudget / maxBudget: numeric range (budget string parsed as number; invalid parsed as 0 or skipped)
 * - q: case-insensitive partial match in title OR description
 * - location: case-insensitive partial match in location
 * - skills: job must include AT LEAST ONE of the requested skills (case-insensitive)
 */
export function jobMatchesFilters(job: JobForFilter, filters: JobFilterParams): boolean {
  if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
    const budgetNum = Number(job.budget);
    if (Number.isNaN(budgetNum)) return false;
    if (filters.minBudget !== undefined && budgetNum < filters.minBudget) return false;
    if (filters.maxBudget !== undefined && budgetNum > filters.maxBudget) return false;
  }

  if (filters.q) {
    const q = filters.q.toLowerCase();
    const title = (job.title ?? "").toLowerCase();
    const description = (job.description ?? "").toLowerCase();
    if (!title.includes(q) && !description.includes(q)) return false;
  }

  if (filters.location) {
    const loc = (job.location ?? "").toLowerCase();
    if (!loc.includes(filters.location.toLowerCase())) return false;
  }

  if (filters.skills && filters.skills.length > 0) {
    const jobSkills = parseJobSkills(job.skills);
    const hasMatch = filters.skills.some((s) => jobSkills.includes(s));
    if (!hasMatch) return false;
  }

  return true;
}
