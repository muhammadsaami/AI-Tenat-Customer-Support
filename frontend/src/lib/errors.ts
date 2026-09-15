import { ApiError } from "@/services/api/client";

export function errorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return err.detail ?? "This request is invalid.";
      case 401:
        return "Your session has expired or the credentials are invalid. Please sign in again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "That resource was not found.";
      case 409:
        return err.detail ?? "That record already exists.";
      case 413:
        return "That file is too large. The limit is 10 MB.";
      case 422:
        return "Please check the information you entered. Some fields are invalid.";
      case 429:
        return (
          err.detail ??
          "Too many attempts. Please wait a minute before trying again."
        );
      default:
        if (err.status >= 500) {
          return "The service is temporarily unavailable. Please try again in a moment.";
        }
        return err.detail ?? err.message ?? fallback;
    }
  }
  if (err instanceof TypeError) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}