import { z } from "zod";

export const giftRequestSchema = z.object({
  recipient: z.string().trim().min(1).max(200),
  quirk: z.string().trim().min(1).max(500),
}).strict();

export type GiftRequest = z.infer<typeof giftRequestSchema>;
export type CatalogGift = { id: number; name: string | null; recipient_tags: string | null; quirk_tags: string | null };

export function parseSelectedGiftId(answer: string, catalog: CatalogGift[]): number | null {
  const value = answer.trim();
  if (value === "NONE") return null;
  if (!/^\d+$/.test(value)) throw new Error("Invalid selection");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || !catalog.some((gift) => gift.id === id)) {
    throw new Error("Invalid selection");
  }
  return id;
}

export async function selectCatalogGift<T>(
  catalog: CatalogGift[],
  select: (catalog: CatalogGift[]) => Promise<string>,
  load: (id: number) => Promise<T | null>,
): Promise<T | null> {
  if (catalog.length === 0) return null;
  const id = parseSelectedGiftId(await select(catalog), catalog);
  return id === null ? null : load(id);
}