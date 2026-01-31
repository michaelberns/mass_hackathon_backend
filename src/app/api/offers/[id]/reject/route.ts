import { NextRequest } from "next/server";
import { rejectOffer } from "@/lib/services/offerService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/offers/:id/reject - Reject an offer (job creator only)
 * Pass X-User-Id header (job creator's userId).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const userId = request.headers.get("X-User-Id") ?? "";
    if (!userId) {
      return Response.json(
        { error: "X-User-Id header required (job creator)" },
        { status: 400 }
      );
    }
    const offer = await rejectOffer(offerId, userId);
    return Response.json(offer);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
