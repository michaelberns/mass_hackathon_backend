import { prisma } from "@/lib/db";
import { notFound, forbidden, badRequest } from "@/lib/errors";
import { jobMatchesFilters } from "@/lib/jobFilters";
import type { JobCreate, JobUpdate, JobFilterParams } from "@/types";

function parseImages(images: string): string[] {
  try {
    const arr = JSON.parse(images) as unknown;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function validateCoordinates(latitude: number | undefined, longitude: number | undefined): void {
  if (latitude !== undefined) {
    const lat = Number(latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) throw badRequest("latitude must be between -90 and 90");
  }
  if (longitude !== undefined) {
    const lon = Number(longitude);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) throw badRequest("longitude must be between -180 and 180");
  }
}

export async function createJob(data: JobCreate) {
  validateCoordinates(data.latitude, data.longitude);
  return prisma.job.create({
    data: {
      title: data.title,
      description: data.description,
      location: data.location,
      budget: data.budget,
      images: JSON.stringify(data.images ?? []),
      video: data.video ?? null,
      createdBy: data.createdBy,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      skills: data.skills != null ? JSON.stringify(data.skills) : null,
    },
  });
}

export async function getAllJobs() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { offers: true } },
    },
  });
  return jobs.map((j) => ({
    ...toJobResponse(j),
    offerCount: j._count.offers,
    _count: undefined,
  }));
}

function parseSkills(skills: string | null): string[] {
  if (skills == null || skills === "") return [];
  try {
    const arr = JSON.parse(skills) as unknown;
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Serialize job for API: images/skills parsed, closedAt as ISO string, closeRequestedBy included. */
function toJobResponse<T extends { images: string; skills: string | null }>(j: T): T & {
  images: string[];
  skills: string[];
  closedAt: string | null;
  closeRequestedBy: string | null;
} {
  const row = j as T & { closedAt?: Date | null; closeRequestedBy?: string | null };
  return {
    ...j,
    images: parseImages(j.images),
    skills: parseSkills(j.skills),
    closedAt: row.closedAt != null ? row.closedAt.toISOString() : null,
    closeRequestedBy: row.closeRequestedBy ?? null,
  };
}

export async function getJobById(id: string) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: { _count: { select: { offers: true } } },
  });
  if (!job) throw notFound("Job not found");
  return {
    ...toJobResponse(job),
    offerCount: job._count.offers,
    _count: undefined,
  };
}

export async function updateJob(id: string, userId: string, data: JobUpdate) {
  validateCoordinates(data.latitude, data.longitude);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw notFound("Job not found");
  if (job.createdBy !== userId) throw forbidden("Only the job creator can update this job");
  return prisma.job.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
      ...(data.video !== undefined && { video: data.video ?? null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.latitude !== undefined && { latitude: data.latitude ?? null }),
      ...(data.longitude !== undefined && { longitude: data.longitude ?? null }),
      ...(data.skills !== undefined && { skills: data.skills != null ? JSON.stringify(data.skills) : null }),
    },
  });
}

export async function deleteJob(id: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw notFound("Job not found");
  if (job.createdBy !== userId) throw forbidden("Only the job creator can delete this job");
  await prisma.job.delete({ where: { id } });
  return { deleted: true };
}

/**
 * Labour requests to close the job. Only allowed when job is "reserved" and user is the accepted labour.
 * Sets closeRequestedBy = "labour". Does not close the job; client must approve via POST /api/jobs/:id/close.
 */
export async function requestClose(jobId: string, labourUserId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { _count: { select: { offers: true } } },
  });
  if (!job) throw notFound("Job not found");
  if (job.status !== "reserved") throw badRequest("Job can only be closed when it is reserved");
  const acceptedOffer = await prisma.offer.findFirst({
    where: { jobId, userId: labourUserId, status: "accepted" },
  });
  if (!acceptedOffer) throw forbidden("Only the accepted labour for this job can request to close it");
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { closeRequestedBy: "labour" },
    include: { _count: { select: { offers: true } } },
  });
  return {
    ...toJobResponse(updated),
    offerCount: updated._count.offers,
    _count: undefined,
  };
}

/**
 * Client closes the job. Only allowed when job is "reserved" and user is the job creator.
 * Sets status = "closed", closedAt = now(), closeRequestedBy = null.
 */
export async function closeJob(jobId: string, clientUserId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { _count: { select: { offers: true } } },
  });
  if (!job) throw notFound("Job not found");
  if (job.status !== "reserved") throw badRequest("Job can only be closed when it is reserved");
  if (job.createdBy !== clientUserId) throw forbidden("Only the job creator can close this job");
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "closed",
      closedAt: new Date(),
      closeRequestedBy: null,
    },
    include: { _count: { select: { offers: true } } },
  });
  return {
    ...toJobResponse(updated),
    offerCount: updated._count.offers,
    _count: undefined,
  };
}

/**
 * Client rejects labour's close request. Only job creator can do this. Sets closeRequestedBy = null.
 */
export async function rejectCloseRequest(jobId: string, clientUserId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { _count: { select: { offers: true } } },
  });
  if (!job) throw notFound("Job not found");
  if (job.createdBy !== clientUserId) throw forbidden("Only the job creator can reject a close request");
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { closeRequestedBy: null },
    include: { _count: { select: { offers: true } } },
  });
  return {
    ...toJobResponse(updated),
    offerCount: updated._count.offers,
    _count: undefined,
  };
}

/**
 * Get "My Jobs" for a user: jobs they created (as client) + jobs where they have an accepted offer (as labour).
 * Returns { created, workingOn } so the frontend can show "Jobs I created" and "Jobs I'm working on" separately.
 */
export async function getJobsForUser(userId: string) {
  const [createdJobs, acceptedOfferJobs] = await Promise.all([
    prisma.job.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { offers: true } } },
    }),
    prisma.job.findMany({
      where: {
        offers: {
          some: { userId, status: "accepted" },
        },
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { offers: true } } },
    }),
  ]);
  const createdIds = new Set(createdJobs.map((j) => j.id));
  const workingOnJobs = acceptedOfferJobs.filter((j) => !createdIds.has(j.id));

  const mapJob = (j: (typeof createdJobs)[0]) => ({
    ...toJobResponse(j),
    offerCount: j._count.offers,
    _count: undefined,
  });

  return {
    created: createdJobs.map(mapJob),
    workingOn: workingOnJobs.map(mapJob),
  };
}

/** Build Prisma where clause for status filter. "all" or missing → no status filter. */
function statusWhere(status: JobFilterParams["status"]): { status: string } | Record<string, never> {
  if (status === "open" || status === "reserved" || status === "closed") return { status };
  return {};
}

/**
 * Get jobs with optional filters (status, price, text, location, skills). Full payload with offerCount.
 * status=open|reserved|closed|all (default "all"). Combines with minBudget, maxBudget, q, location, skills.
 * Example: GET /api/jobs?status=open&minBudget=50&skills=plumbing&q=kitchen
 */
export async function getFilteredJobs(filters: JobFilterParams) {
  const where = statusWhere(filters.status);
  const jobs = await prisma.job.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });
  const hasOtherFilters =
    filters.minBudget !== undefined ||
    filters.maxBudget !== undefined ||
    filters.q ||
    filters.location ||
    (filters.skills != null && filters.skills.length > 0);
  const filtered = hasOtherFilters
    ? jobs.filter((j) => jobMatchesFilters({ budget: j.budget, title: j.title, description: j.description, location: j.location, skills: j.skills }, filters))
    : jobs;
  return filtered.map((j) => ({
    ...j,
    images: parseImages(j.images),
    skills: parseSkills(j.skills),
    offerCount: j._count.offers,
    _count: undefined,
  }));
}

/**
 * Get jobs with valid coordinates for map display, with optional filters (status, price, text, location, skills). Minimal payload.
 * status=open|reserved|closed|all (default "all"). Only returns jobs with both latitude and longitude set.
 * Example: GET /api/jobs/map?status=reserved&q=kitchen
 */
export async function getFilteredJobsForMap(filters: JobFilterParams) {
  const statusClause = statusWhere(filters.status);
  const where = {
    ...(Object.keys(statusClause).length > 0 ? statusClause : {}),
    latitude: { not: null },
    longitude: { not: null },
  };
  const jobs = await prisma.job.findMany({
    where,
    select: { id: true, title: true, description: true, location: true, budget: true, skills: true, latitude: true, longitude: true, images: true },
  });
  const hasOtherFilters =
    filters.minBudget !== undefined ||
    filters.maxBudget !== undefined ||
    filters.q ||
    filters.location ||
    (filters.skills != null && filters.skills.length > 0);
  const filtered = hasOtherFilters
    ? jobs.filter((j) => jobMatchesFilters({ budget: j.budget, title: j.title, description: j.description, location: j.location, skills: j.skills }, filters))
    : jobs;
  return filtered.map((j) => {
    const images = parseImages(j.images);
    return {
      id: j.id,
      title: j.title,
      budget: j.budget,
      latitude: j.latitude as number,
      longitude: j.longitude as number,
      images,
    };
  });
}
