import { NextResponse } from "next/server";
import type { ApiError } from "@/types";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message = "Resource not found") {
  return new AppError(message, 404, "NOT_FOUND");
}

export function forbidden(message = "Forbidden") {
  return new AppError(message, 403, "FORBIDDEN");
}

export function badRequest(message = "Bad request") {
  return new AppError(message, 400, "BAD_REQUEST");
}

export function serviceUnavailable(message = "Service unavailable") {
  return new AppError(message, 503, "SERVICE_UNAVAILABLE");
}

export function apiErrorResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json(
    { error: message, code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
