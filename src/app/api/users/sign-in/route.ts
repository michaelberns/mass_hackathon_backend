import { NextRequest } from "next/server";
import { findUserByNameAndEmail } from "@/lib/services/userService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/users/sign-in - Sign in with name and email only.
 * Example body: { "name": "Jane Doe", "email": "jane@example.com" }
 * Returns the user if name and email match; 401 if not.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { name, email } = body as { name?: string; email?: string };
    if (!name || !email) {
      return Response.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }
    const user = await findUserByNameAndEmail(name, email);
    if (!user) {
      return Response.json(
        { error: "Invalid name or email" },
        { status: 401 }
      );
    }
    return Response.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
