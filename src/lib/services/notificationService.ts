import { prisma } from "@/lib/db";
import { notFound, forbidden } from "@/lib/errors";
import type { NotificationCreate } from "@/types";

/**
 * Create a notification (e.g. from offer flows). New notifications are always created with read = false.
 */
export async function createNotification(data: NotificationCreate) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      jobId: data.jobId ?? null,
      offerId: data.offerId ?? null,
      message: data.message,
      read: false,
    },
  });
}

export interface NotificationsWithUnreadCount {
  unreadCount: number;
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    jobId: string | null;
    offerId: string | null;
    message: string;
    read: boolean;
    createdAt: Date;
    jobTitle?: string;
  }>;
}

/**
 * Get all notifications for a user (newest first) and unread count for badge.
 * Read state persists in DB; unreadCount only counts notifications with read = false.
 */
export async function getNotificationsByUserId(userId: string): Promise<NotificationsWithUnreadCount> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const unreadCount = notifications.filter((n) => !n.read).length;
  const jobIds = Array.from(new Set(notifications.map((n) => n.jobId).filter(Boolean))) as string[];
  const jobs = jobIds.length
    ? await prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true },
      })
    : [];
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j.title]));
  const list = notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    jobId: n.jobId,
    offerId: n.offerId,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    jobTitle: n.jobId ? jobMap[n.jobId] : undefined,
  }));
  return { unreadCount, notifications: list };
}

/**
 * Mark a notification as read. Only the notification's user can mark it.
 * Once read, it stays read (persisted in DB).
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) throw notFound("Notification not found");
  if (notification.userId !== userId) throw forbidden("You can only mark your own notifications as read");
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Mark all notifications for a user as read. Only the user can mark their own.
 */
export async function markAllNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId },
    data: { read: true },
  });
  return getNotificationsByUserId(userId);
}
