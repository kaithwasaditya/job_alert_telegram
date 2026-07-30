import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function requireSyncedUser() {
  const clerkUser = await currentUser();

  if (!clerkUser?.id) {
    throw new Error("Not signed in");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id}@clerk.local`;

  return prisma.user.upsert({
    where: { id: clerkUser.id },
    update: { email },
    create: {
      id: clerkUser.id,
      email
    }
  });
}
