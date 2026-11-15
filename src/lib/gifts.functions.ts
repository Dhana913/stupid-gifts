import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Gift = Pick<
  Database["public"]["Tables"]["gifts"]["Row"],
  "id" | "name" | "description" | "image_url" | "purchase_url" | "fictional_review"
>;

// Temporary selection: the first gift by ID, regardless of user input.
// Will be replaced with AI-based gift selection later.
export const getFirstGift = createServerFn({ method: "GET" }).handler(async (): Promise<Gift | null> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
  const { data, error } = await supabase
    .from("gifts")
    .select("id, name, description, image_url, purchase_url, fictional_review")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load gifts");
  return data;
});
