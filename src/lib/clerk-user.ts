import { currentUser } from "@clerk/nextjs/server";
import { query } from "@/lib/db";

export async function requireSyncedUser() {
  const clerkUser = await currentUser();

  if (!clerkUser?.id) {
    throw new Error("Not signed in");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id}@clerk.local`;

  const res = await query(
    `INSERT INTO users (id, email)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, created_at AS "createdAt"`,
    [clerkUser.id, email]
  );

  return res.rows[0] as { id: string; email: string; createdAt: Date };
}
