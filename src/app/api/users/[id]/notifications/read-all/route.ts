import { NextRequest } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/services/notificationService";
import { apiErrorResponse } from "@/lib/errors";
import { getUserById } from "@/lib/services/userService";

/**
 * POST /api/users/:id/notifications/read-all
 * Marks all notifications for the user as read. Only the user can mark their own (id in path = user).
 * Pass X-User-Id header with the same user id to confirm ownership.
 *
 * Output example: same as GET /api/users/:id/notifications (unreadCount will be 0, all notifications have read: true)
 * { "unreadCount": 0, "notifications": [ {...}, ... ] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const headerUserId = request.headers.get("X-User-Id") ?? "";
    if (!headerUserId) {
      return Response.json(
        { error: "X-User-Id header required" },
        { status: 400 }
      );
    }
    if (headerUserId !== userId) {
      return Response.json(
        { error: "You can only mark your own notifications as read" },
        { status: 403 }
      );
    }
    await getUserById(userId);
    const result = await markAllNotificationsAsRead(userId);
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
