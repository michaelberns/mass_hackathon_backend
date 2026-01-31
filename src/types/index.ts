// API request/response types and DTOs

export type UserRole = "client" | "labour";
export type JobStatus = "open" | "reserved" | "closed";
export type OfferStatus = "pending" | "accepted" | "rejected";

export interface UserCreate {
  name: string;
  email: string;
  role: UserRole;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  role?: UserRole;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  yearsOfExperience?: number;
  companyName?: string;
}

export interface JobCreate {
  title: string;
  description: string;
  location: string;
  budget: string;
  images: string[];
  video?: string;
  createdBy: string;
  latitude?: number;
  longitude?: number;
  skills?: string[];
}

export interface JobUpdate {
  title?: string;
  description?: string;
  location?: string;
  budget?: string;
  images?: string[];
  video?: string;
  status?: JobStatus;
  latitude?: number;
  longitude?: number;
  skills?: string[];
}

/** Query param for job list/map: "open" | "reserved" | "closed" | "all". Default "all". */
export type JobStatusFilter = "open" | "reserved" | "closed" | "all";

/** Query params for filtering jobs (GET /api/jobs, GET /api/jobs/map) */
export interface JobFilterParams {
  minBudget?: number;
  maxBudget?: number;
  q?: string;
  location?: string;
  skills?: string[];
  /** "open" | "reserved" | "closed" | "all". Default "all". */
  status?: JobStatusFilter;
}

export interface OfferCreate {
  jobId: string;
  userId: string;
  proposedPrice: string;
  message: string;
}

export type NotificationType = "NEW_OFFER" | "OFFER_ACCEPTED" | "OFFER_REJECTED";

export interface NotificationCreate {
  userId: string;
  type: NotificationType;
  jobId?: string;
  offerId?: string;
  message: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
