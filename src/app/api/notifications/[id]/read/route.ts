import { NextRequest } from "next/server";
import { markNotificationAsRead } from "@/lib/services/notificationService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/notifications/:id/read
 * Marks a notification as read. Only the notification's user can mark it.
 * Pass X-User-Id header with the current user's id.
 *
 * Input: none (id in URL; X-User-Id header required)
 * Output example: { "id": "notif_1", "userId": "user_1", "type": "NEW_OFFER", "jobId": "job_1", "offerId": "offer_1", "message": "...", "read": true, "createdAt": "..." }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    const userId = request.headers.get("X-User-Id") ?? "";
    if (!userId) {
      return Response.json(
        { error: "X-User-Id header required" },
        { status: 400 }
      );
    }
    const notification = await markNotificationAsRead(notificationId, userId);
    return Response.json(notification);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
