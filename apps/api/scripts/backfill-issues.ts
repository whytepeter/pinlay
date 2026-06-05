/**
 * One-off backfill: create an Issue row for every Session that has Pins but
 * no Issue. After this runs, every existing pin shows up in the dashboard's
 * /issues feed — the same behavior that `createPin` now guarantees going
 * forward (eager Issue creation on the first pin of a sitting).
 *
 * Run from the repo root:
 *   pnpm --filter @pinlay/api exec npx tsx scripts/backfill-issues.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orphanSessions = await prisma.session.findMany({
    where: {
      issue: null,
      pins: { some: {} },
    },
    include: { _count: { select: { pins: true } } },
  });

  if (orphanSessions.length === 0) {
    console.log("No orphan sessions — nothing to backfill.");
    return;
  }

  console.log(`Backfilling Issues for ${orphanSessions.length} session(s)…`);

  for (const session of orphanSessions) {
    let host = session.pageUrl;
    try {
      host = new URL(session.pageUrl).host;
    } catch {
      /* keep raw url */
    }

    const issue = await prisma.issue.create({
      data: {
        workspaceId: session.workspaceId,
        sessionId: session.id,
        authorId: session.authorId,
        title: `Untitled review · ${host}`,
        pageUrl: session.pageUrl,
        status: "open",
      },
    });

    const linked = await prisma.pin.updateMany({
      where: { sessionId: session.id, issueId: null },
      data: { issueId: issue.id },
    });

    console.log(
      `  ${session.pageUrl} → issue ${issue.id} (${linked.count} pin${linked.count === 1 ? "" : "s"} linked)`,
    );
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
