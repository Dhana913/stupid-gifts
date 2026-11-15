import { describe, expect, it, vi, afterEach } from "vitest";
import { giftRequestSchema, parseSelectedGiftId, selectCatalogGift } from "@/lib/gift-selection";
import { askOpenAI, createGiftRequestLimiter } from "@/lib/gift-selection.server";

const catalog = [
  { id: 1, name: "Toilet Timer", recipient_tags: "partner", quirk_tags: "bathroom" },
  { id: 7, name: "Meeting Bell", recipient_tags: "boss", quirk_tags: "meetings" },
];
afterEach(() => vi.unstubAllGlobals());

describe("Catalog-only gift selection", () => {
  it("accepts only an existing ID and rejects invented gifts or generated content", () => {
    expect(parseSelectedGiftId("7", catalog)).toBe(7);
    expect(() => parseSelectedGiftId("999", catalog)).toThrow();
    expect(() => parseSelectedGiftId('7: a hilarious new gift', catalog)).toThrow();
  });
  it("returns no match without fetching or inventing a gift", async () => {
    const load = vi.fn();
    expect(await selectCatalogGift(catalog, async () => "NONE", load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
  it("does not call OpenAI for an empty catalogue", async () => {
    const select = vi.fn();
    expect(await selectCatalogGift([], select, vi.fn())).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
  it("retrieves the selected complete record unchanged", async () => {
    const record = { id: 7, name: "Meeting Bell", description: "Existing description", fictional_review: "Existing review", image_url: "existing-photo", purchase_url: "existing-link" };
    const load = vi.fn(async () => record);
    expect(await selectCatalogGift(catalog, async () => "7", load)).toEqual(record);
    expect(load).toHaveBeenCalledWith(7);
  });
  it("limits inputs to 200 recipient and 500 quirk characters", () => {
    expect(giftRequestSchema.safeParse({ recipient: "a".repeat(200), quirk: "b".repeat(500) }).success).toBe(true);
    expect(giftRequestSchema.safeParse({ recipient: "a".repeat(201), quirk: "b" }).success).toBe(false);
    expect(giftRequestSchema.safeParse({ recipient: "a", quirk: "b".repeat(501) }).success).toBe(false);
    expect(giftRequestSchema.safeParse({ recipient: " ", quirk: "b" }).success).toBe(false);
  });
  it("allows five requests per visitor per minute and resets after one minute", () => {
    const allow = createGiftRequestLimiter();
    for (let i = 0; i < 5; i++) expect(allow("visitor", 0)).toBe(true);
    expect(allow("visitor", 59_999)).toBe(false);
    expect(allow("visitor", 60_000)).toBe(true);
  });
  it("allows 100 requests per instance per hour and resets after one hour", () => {
    const allow = createGiftRequestLimiter();
    for (let i = 0; i < 100; i++) expect(allow(`visitor-${i}`, 0)).toBe(true);
    expect(allow("new-visitor", 3_599_999)).toBe(false);
    expect(allow("new-visitor", 3_600_000)).toBe(true);
  });
  it("sends only names, IDs, tags and user inputs to the low-cost model", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: "7" }, finish_reason: "stop" }] })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(askOpenAI("test-only-placeholder", { recipient: "boss", quirk: "meetings" }, catalog)).resolves.toBe("7");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("gpt-4.1-mini");
    expect(JSON.parse(body.messages[1].content)).toEqual({ recipient: "boss", quirk: "meetings", gifts: catalog });
  });
  it("handles OpenAI failures without treating them as no match", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
    await expect(askOpenAI("test-only-placeholder", { recipient: "boss", quirk: "meetings" }, catalog)).rejects.toThrow("Selection provider unavailable");
  });
});