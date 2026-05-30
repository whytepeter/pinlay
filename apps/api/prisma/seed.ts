import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Dev seed — creates a single workspace + owner so the extension can talk to
// a real API without going through signup. Re-run safe (upserts).
// Password is "pinlay-dev" — fine for local, never use in prod.
const DEV_PASSWORD = "pinlay-dev";

async function main() {
  // Honour DEV_USER_EMAIL so the seeded user is also the one the JwtAuthGuard
  // falls back to when no bearer token is sent.
  const email = (process.env["DEV_USER_EMAIL"] ?? "you@pinlay.dev")
    .trim()
    .toLowerCase();
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Dev User",
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "dev" },
    update: {},
    create: {
      slug: "dev",
      name: "Dev workspace",
      plan: "team",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
    update: { role: "owner" },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    },
  });

  console.log(
    `Seeded ${user.email} into workspace ${workspace.slug} (password: "${DEV_PASSWORD}")`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
