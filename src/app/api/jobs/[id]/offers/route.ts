import { NextRequest } from "next/server";
import { createOffer, getOffersByJobId } from "@/lib/services/offerService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * GET /api/jobs/:id/offers - Get all offers for a job
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const offers = await getOffersByJobId(jobId);
    return Response.json(offers);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/jobs/:id/offers - Create offer for job (labour only)
 * Example body: { "userId": "<labourUserId>", "proposedPrice": "80", "message": "I can do it tomorrow" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = (await request.json()) as unknown;
    const { userId, proposedPrice, message } = body as {
      userId?: string;
      proposedPrice?: string;
      message?: string;
    };
    if (!userId || proposedPrice === undefined || proposedPrice === null || !message) {
      return Response.json(
        { error: "userId, proposedPrice and message are required" },
        { status: 400 }
      );
    }
    const offer = await createOffer({
      jobId,
      userId,
      proposedPrice: String(proposedPrice),
      message,
    });
    return Response.json(offer, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
