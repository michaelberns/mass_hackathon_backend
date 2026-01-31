import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { badRequest, serviceUnavailable } from "@/lib/errors";

// File validation: allowed types and size limits
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);
const ALLOWED_IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const ALLOWED_VIDEO_EXT = /\.(mp4|webm)$/i;

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB per image
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB per video
const MAX_IMAGES_COUNT = 10;

export interface UploadResult {
  images: string[];
  video?: string;
}

function getMimeOrExt(file: Blob & { name?: string }): { mime: string; name: string } {
  const mime = file.type ?? "";
  const name = file.name ?? "";
  return { mime, name };
}

function validateImage(file: Blob & { name?: string }): void {
  const { mime, name } = getMimeOrExt(file);
  if (!ALLOWED_IMAGE_MIMES.has(mime) && !ALLOWED_IMAGE_EXT.test(name)) {
    throw badRequest(
      `Invalid image type. Allowed: jpg, png, webp. Got: ${name || mime || "unknown"}`
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw badRequest(
      `Image too large. Max size: ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB. Got: ${(file.size / 1024 / 1024).toFixed(2)} MB`
    );
  }
}

function validateVideo(file: Blob & { name?: string }): void {
  const { mime, name } = getMimeOrExt(file);
  if (!ALLOWED_VIDEO_MIMES.has(mime) && !ALLOWED_VIDEO_EXT.test(name)) {
    throw badRequest(
      `Invalid video type. Allowed: mp4, webm. Got: ${name || mime || "unknown"}`
    );
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw badRequest(
      `Video too large. Max size: ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB. Got: ${(file.size / 1024 / 1024).toFixed(2)} MB`
    );
  }
}

function ensureCloudinaryConfig(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw serviceUnavailable(
      "Upload not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env (see .env.example)."
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  options: { resource_type: "image" | "video"; folder?: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: options.resource_type,
        folder: options.folder ?? "job-media",
      },
      (err, result) => {
        if (err) reject(err);
        else if (result?.secure_url) resolve(result.secure_url);
        else reject(new Error("Cloudinary returned no URL"));
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

export async function uploadMedia(files: {
  images: (Blob & { name?: string })[];
  video?: (Blob & { name?: string }) | null;
}): Promise<UploadResult> {
  ensureCloudinaryConfig();

  const result: UploadResult = { images: [] };

  if (files.images.length > MAX_IMAGES_COUNT) {
    throw badRequest(`Too many images. Max: ${MAX_IMAGES_COUNT}.`);
  }

  for (const file of files.images) {
    validateImage(file);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadBufferToCloudinary(buffer, {
      resource_type: "image",
      folder: "job-media/images",
    });
    result.images.push(url);
  }

  if (files.video != null && files.video.size > 0) {
    validateVideo(files.video);
    const arrayBuffer = await files.video.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadBufferToCloudinary(buffer, {
      resource_type: "video",
      folder: "job-media/videos",
    });
    result.video = url;
  }

  return result;
}
