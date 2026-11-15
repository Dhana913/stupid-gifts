import { describe, expect, it } from "vitest";
import { buildShareMessage, shouldUseNativeShare } from "@/lib/gift-sharing";

describe("Gift sharing", () => {
  it("uses the recipient, displayed gift, and actual website URL", () => {
    expect(buildShareMessage("My partner", "Toilet Timer", "https://stupidgifts.example")).toBe("I got my partner a Toilet Timer. Thoughtful gifts are overrated. Find your own stupid gift at https://stupidgifts.example.");
  });
  it("preserves arbitrary free-text recipient values", () => {
    expect(buildShareMessage("  boss from accounting  ", "Toilet Timer", "https://gifts.example")).toBe("I got my boss from accounting a Toilet Timer. Thoughtful gifts are overrated. Find your own stupid gift at https://gifts.example.");
  });
  it("never chooses native sharing on Windows laptops, even with touch", () => {
    expect(shouldUseNativeShare("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 10, true)).toBe(false);
  });
  it("never chooses native sharing on desktop Macs", () => {
    expect(shouldUseNativeShare("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 0, false)).toBe(false);
  });
  it("chooses native sharing on mobile phones", () => {
    expect(shouldUseNativeShare("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", 5, true)).toBe(true);
    expect(shouldUseNativeShare("Mozilla/5.0 (Linux; Android 15)", 5, true)).toBe(true);
  });
  it("recognizes iPads reporting a desktop user agent", () => {
    expect(shouldUseNativeShare("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 5, true)).toBe(true);
  });
});