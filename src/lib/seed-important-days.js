import { prisma } from "./prisma";
import { SEED_DAYS } from "./important-days-seed";

/**
 * Loads the starter set of festivals once.
 *
 * Guarded by "has anything been seeded before", so days the team edited or
 * deleted are not resurrected on the next page load.
 *
 * Uses upsert per row rather than createMany({ skipDuplicates }): that option
 * isn't supported on every datasource, and twenty-odd rows written once is not
 * worth a datasource-specific code path.
 */
export async function seedImportantDays() {
  const already = await prisma.importantDay.count({ where: { seeded: true } });
  if (already > 0) return { seeded: 0 };

  let seeded = 0;
  for (const d of SEED_DAYS) {
    try {
      await prisma.importantDay.upsert({
        where: { name_date: { name: d.name, date: d.date } },
        update: {},
        create: {
          name: d.name,
          date: d.date,
          annual: !!d.annual,
          kind: d.kind ?? "Festival",
          note: d.note ?? "",
          seeded: true,
        },
      });
      seeded += 1;
    } catch (e) {
      // One bad row shouldn't stop the rest loading.
      console.error(`[important-days] could not seed "${d.name}":`, e?.message);
    }
  }
  return { seeded };
}
