import { prisma } from "@/lib/db";
import { notFound, forbidden, badRequest } from "@/lib/errors";
import { createNotification } from "./notificationService";
import type { OfferCreate } from "@/types";

export async function createOffer(data: OfferCreate) {
  const job = await prisma.job.findUnique({ where: { id: data.jobId } });
  if (!job) throw notFound("Job not found");
  if (job.status !== "open") throw badRequest("Job is not open for offers");
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw notFound("User not found");
  if (user.role !== "labour") throw badRequest("Only labour users can create offers");
  if (job.createdBy === data.userId) throw badRequest("Job creator cannot offer on their own job");
  const pendingOffer = await prisma.offer.findFirst({
    where: { jobId: data.jobId, userId: data.userId, status: "pending" },
  });
  if (pendingOffer) throw badRequest("You already have a pending offer for this job");
  const offer = await prisma.offer.create({
    data: {
      jobId: data.jobId,
      userId: data.userId,
      proposedPrice: data.proposedPrice,
      message: data.message,
    },
  });
  await createNotification({
    userId: job.createdBy,
    type: "NEW_OFFER",
    jobId: job.id,
    offerId: offer.id,
    message: `New offer received for your job: ${job.title}`,
  });
  return offer;
}

export async function getOffersByJobId(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw notFound("Job not found");
  return prisma.offer.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
}

export async function acceptOffer(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { job: true },
  });
  if (!offer) throw notFound("Offer not found");
  if (offer.job.createdBy !== userId) throw forbidden("Only the job creator can accept offers");
  if (offer.status !== "pending") throw badRequest("Offer is not pending");
  await prisma.$transaction([
    prisma.offer.updateMany({
      where: { jobId: offer.jobId, id: { not: offerId } },
      data: { status: "rejected" },
    }),
    prisma.offer.update({
      where: { id: offerId },
      data: { status: "accepted" },
    }),
    prisma.job.update({
      where: { id: offer.jobId },
      data: { status: "reserved" },
    }),
  ]);
  return prisma.offer.findUnique({
    where: { id: offerId },
    include: { job: true, user: true },
  });
}

export async function rejectOffer(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { job: true, user: true },
  });
  if (!offer) throw notFound("Offer not found");
  if (offer.job.createdBy !== userId) throw forbidden("Only the job creator can reject offers");
  if (offer.status !== "pending") throw badRequest("Offer is not pending");
  await prisma.offer.update({
    where: { id: offerId },
    data: { status: "rejected" },
  });
  await createNotification({
    userId: offer.userId,
    type: "OFFER_REJECTED",
    jobId: offer.jobId,
    offerId: offer.id,
    message: `Your offer was rejected for job: ${offer.job.title}`,
  });
  return prisma.offer.findUnique({
    where: { id: offerId },
    include: { job: true, user: true },
  });
}
