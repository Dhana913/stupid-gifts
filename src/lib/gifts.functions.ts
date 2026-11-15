import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getRequestHeader } from "@tanstack/react-start/server";
import { giftRequestSchema, selectCatalogGift, type CatalogGift } from "./gift-selection";
import { allowGiftRequest, askOpenAI } from "./gift-selection.server";

export type Gift = Pick<
  Database["public"]["Tables"]["gifts"]["Row"],
  "id" | "name" | "description" | "image_url" | "purchase_url" | "fictional_review"
>;

export type GiftResult = { gift: Gift | null; error: string | null };

export const findGift = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => giftRequestSchema.parse(input))
  .handler(async ({ data }): Promise<GiftResult> => {
  // CF supplies this header at the edge. Missing visitor identity shares one bucket;
  // never trust caller-supplied forwarded-for headers to bypass the limit.
  const visitor = getRequestHeader("cf-connecting-ip") ?? "shared-unknown";
  if (!allowGiftRequest(visitor, Date.now())) {
    return { gift: null, error: "Too many gift searches. Please try again later." };
  }
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!key || !url || !apiKey) {
    return { gift: null, error: "Gift selection is temporarily unavailable. Please try again later." };
  }
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  try {
    const catalog: CatalogGift[] = [];
    // Keyset pagination retrieves every available record, beyond Supabase's row cap.
    let afterId: number | undefined;
    for (;;) {
      let query = supabase.from("gifts")
        .select("id, name, recipient_tags, quirk_tags")
        .order("id", { ascending: true }).limit(500).abortSignal(AbortSignal.timeout(10_000));
      if (afterId !== undefined) query = query.gt("id", afterId);
      const { data: rows, error } = await query;
      if (error) throw new Error("Catalogue unavailable");
      if (!rows?.length) break;
      catalog.push(...rows);
      afterId = rows.at(-1)?.id;
    }
    const gift = await selectCatalogGift(catalog,
      (available) => askOpenAI(apiKey, data, available),
      async (id) => {
        const { data: selected, error } = await supabase.from("gifts")
          .select("id, name, description, image_url, purchase_url, fictional_review")
          .eq("id", id).maybeSingle().abortSignal(AbortSignal.timeout(10_000));
        if (error) throw new Error("Gift unavailable");
        return selected;
      },
    );
    return { gift, error: null };
  } catch {
    // Do not log provider payloads, catalogue data, or credentials.
    return { gift: null, error: "Couldn’t select a gift right now. Please try again in a moment." };
  }
});
