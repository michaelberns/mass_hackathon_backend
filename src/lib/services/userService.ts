import { prisma } from "@/lib/db";
import { notFound, badRequest } from "@/lib/errors";
import type { UserCreate, UserUpdate } from "@/types";

function parseSkills(skills: string | null): string[] {
  if (skills == null || skills === "") return [];
  try {
    const arr = JSON.parse(skills) as unknown;
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Compute profileCompleted: location and bio filled; if labour, also skills (≥1) and yearsOfExperience.
 */
function computeProfileCompleted(user: {
  role: string;
  location: string | null;
  bio: string | null;
  skills: string | null;
  yearsOfExperience: number | null;
}): boolean {
  const hasLocation = Boolean(user.location?.trim());
  const hasBio = Boolean(user.bio?.trim());
  if (!hasLocation || !hasBio) return false;
  if (user.role === "labour") {
    const skills = parseSkills(user.skills);
    return skills.length > 0 && user.yearsOfExperience != null && user.yearsOfExperience >= 0;
  }
  return true;
}

export async function createUser(data: UserCreate) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw badRequest("User with this email already exists");
  if (data.role !== "client" && data.role !== "labour") {
    throw badRequest("role must be 'client' or 'labour'");
  }
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      profileCompleted: false,
    },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User not found");
  return {
    ...user,
    skills: parseSkills(user.skills),
  };
}

export async function findUserByNameAndEmail(name: string, email: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return null;
  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user) return null;
  if (user.name.trim().toLowerCase() !== name.trim().toLowerCase()) return null;
  return user;
}

export async function updateUser(id: string, data: UserUpdate) {
  const existing = await getUserById(id);
  if (data.email) {
    const other = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (other) throw badRequest("User with this email already exists");
  }
  if (data.role !== undefined && data.role !== "client" && data.role !== "labour") {
    throw badRequest("role must be 'client' or 'labour'");
  }
  if (data.yearsOfExperience !== undefined) {
    const n = Number(data.yearsOfExperience);
    if (Number.isNaN(n) || n < 0) throw badRequest("yearsOfExperience must be a non-negative number");
  }
  if (data.skills !== undefined) {
    if (!Array.isArray(data.skills)) throw badRequest("skills must be an array of strings");
    if (data.skills.some((s) => typeof s !== "string")) throw badRequest("skills must be an array of strings");
  }

  const updatePayload: Record<string, unknown> = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.role !== undefined && { role: data.role }),
    ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl ?? null }),
    ...(data.location !== undefined && { location: data.location ?? null }),
    ...(data.bio !== undefined && { bio: data.bio ?? null }),
    ...(data.skills !== undefined && { skills: JSON.stringify(data.skills) }),
    ...(data.yearsOfExperience !== undefined && { yearsOfExperience: data.yearsOfExperience }),
    ...(data.companyName !== undefined && { companyName: data.companyName ?? null }),
  };

  const updated = await prisma.user.update({
    where: { id },
    data: updatePayload as Parameters<typeof prisma.user.update>[0]["data"],
  });

  const profileCompleted = computeProfileCompleted({
    role: updated.role,
    location: updated.location,
    bio: updated.bio,
    skills: updated.skills,
    yearsOfExperience: updated.yearsOfExperience,
  });

  if (profileCompleted !== updated.profileCompleted) {
    const withFlag = await prisma.user.update({
      where: { id },
      data: { profileCompleted },
    });
    return { ...withFlag, skills: parseSkills(withFlag.skills) };
  }

  return { ...updated, skills: parseSkills(updated.skills) };
}
