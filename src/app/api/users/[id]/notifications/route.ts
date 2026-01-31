import { NextRequest } from "next/server";
import { getNotificationsByUserId } from "@/lib/services/notificationService";
import { apiErrorResponse } from "@/lib/errors";
import { getUserById } from "@/lib/services/userService";

/**
 * GET /api/users/:id/notifications
 * Returns all notifications for the user (newest first) and unreadCount for badge.
 * Unread = read === false; count persists across reload/login.
 *
 * Output example:
 * {
 *   "unreadCount": 3,
 *   "notifications": [
 *     {
 *       "id": "notif_1",
 *       "userId": "user_1",
 *       "type": "NEW_OFFER",
 *       "jobId": "job_1",
 *       "offerId": "offer_1",
 *       "message": "New offer received for your job: Fix plumbing",
 *       "read": false,
 *       "createdAt": "2024-01-15T10:00:00.000Z",
 *       "jobTitle": "Fix plumbing"
 *     }
 *   ]
 * }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    await getUserById(userId);
    const result = await getNotificationsByUserId(userId);
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
