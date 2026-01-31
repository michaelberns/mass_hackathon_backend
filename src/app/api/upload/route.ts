import { NextRequest } from "next/server";
import { uploadMedia } from "@/lib/services/uploadService";
import { apiErrorResponse } from "@/lib/errors";

/**
 * POST /api/upload - Upload images and optional video for jobs.
 *
 * Content-Type: multipart/form-data
 * Fields:
 *   - images: multiple files (allowed: jpg, png, webp; max 4 MB each; max 10 files)
 *   - video: optional single file (allowed: mp4, webm; max 20 MB)
 *
 * Returns: { images: string[]; video?: string } (public URLs from Cloudinary)
 *
 * Example (curl):
 *   curl -X POST http://localhost:3000/api/upload \
 *     -F "images=@photo1.jpg" \
 *     -F "images=@photo2.png" \
 *     -F "video=@demo.mp4"
 *
 * Example (fetch):
 *   const form = new FormData();
 *   form.append("images", file1);
 *   form.append("images", file2);
 *   form.append("video", videoFile);  // optional
 *   const res = await fetch("/api/upload", { method: "POST", body: form });
 *   const { images, video } = await res.json();
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Next.js/server returns file parts as Blob, not File; accept both (avoid v is Blob predicate - Blob not assignable to FormDataEntryValue)
    const imageEntries = formData.getAll("images").filter((v) => v instanceof Blob) as Blob[];
    const videoEntry = formData.get("video");
    const videoFile = videoEntry instanceof Blob ? videoEntry : null;

    if (imageEntries.length === 0 && !videoFile) {
      return Response.json(
        { error: "No files to upload. Send 'images' (multiple) and/or 'video' (single) in multipart/form-data." },
        { status: 400 }
      );
    }

    const result = await uploadMedia({
      images: imageEntries,
      video: videoFile,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
