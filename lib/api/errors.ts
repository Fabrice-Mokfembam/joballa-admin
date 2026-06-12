import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return "Network error. Check your connection.";
  }

  return "Something went wrong. Please try again.";
}

function humanizeApiMessage(message: string, status: number): string {
  const normalized = message.trim().toLowerCase();

  if (status === 409 || normalized.includes("already exists")) {
    return "This information is already in use. Please use a different value.";
  }
  if (normalized.includes("not found")) return "The requested record could not be found.";
  if (normalized.includes("invalid credentials")) return "The email or password is incorrect.";
  if (normalized.includes("forbidden")) return "You do not have permission to perform this action.";
  return message || "Request failed. Please try again.";
}

export function parseApiError(status: number, data: ApiErrorBody | null): ApiError {
  const msg = typeof data?.error === "object" ? data.error.message : data?.message;
  const rawText = Array.isArray(msg) ? msg.join(" ") : (msg ?? "Request failed");
  const text = humanizeApiMessage(rawText, status);

  switch (status) {
    case 401:
      return new ApiError(text || "Session expired. Please sign in again.", status);
    case 403:
      return new ApiError(text || "You do not have permission for this action.", status);
    case 404:
      return new ApiError(text || "Resource not found.", status);
    case 409:
      return new ApiError(text || "Conflict — record may already exist.", status);
    default:
      return new ApiError(text, status);
  }
}
