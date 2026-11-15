export function buildShareMessage(recipient: string, giftName: string, siteUrl: string) {
  const name = recipient.trim().replace(/^my\s+/i, "");
  return `I got my ${name} a ${giftName}. Thoughtful gifts are overrated. Find your own stupid gift at ${siteUrl}.`;
}

export function shouldUseNativeShare(userAgent: string, touchPoints: number, coarsePointer: boolean) {
  return /Android|iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1 && coarsePointer);
}

export async function copyShareMessage(message: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return;
    }
  } catch { /* Older browsers and clipboard permissions use the fallback below. */ }
  const field = document.createElement("textarea");
  field.value = message;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}