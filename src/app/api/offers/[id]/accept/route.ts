import { NextRequest } from "next/server";
import { acceptOffer } from "@/lib/services/offerService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/offers/:id/accept - Accept an offer (job creator only)
 * Sets offer to accepted, job to reserved, and rejects all other offers.
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
    const result = await acceptOffer(offerId, userId);
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
