import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFirstGift } from "@/lib/gifts.functions";
import { buildShareMessage, copyShareMessage, shouldUseNativeShare } from "@/lib/gift-sharing";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "STUPID GIFTS — Find their perfectly terrible present" },
    { name: "description", content: "Tell us who they are and their most ridiculous quirk. Find a hilariously terrible gift, because thoughtful gifts are overrated." },
    { property: "og:title", content: "STUPID GIFTS — Find their perfectly terrible present" },
    { property: "og:description", content: "Good intentions. Terrible gifts. Find an absurd present for your favorite ridiculous person." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const [recipient, setRecipient] = useState("");
  const [quirk, setQuirk] = useState("");
  const [recommendation, setRecommendation] = useState<{ recipient: string; quirk: string } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sharedMessage, setSharedMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const giftMutation = useMutation({ mutationFn: () => getFirstGift() });
  const gift = giftMutation.data ?? null;

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  function findGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient.trim() || !quirk.trim()) return;
    setRecommendation({ recipient: recipient.trim(), quirk: quirk.trim() });
    setReviewOpen(false);
    setImageFailed(false);
    setFeedback("");
    setSharedMessage("");
    clearTimeout(feedbackTimer.current);
    giftMutation.mutate();
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "instant", block: "start" }));
  }

  async function shareGift() {
    if (!recommendation || !gift || sharing) return;
    const message = buildShareMessage(recommendation.recipient, gift.name ?? "stupid gift", window.location.origin);
    setSharing(true);
    setFeedback("");
    setSharedMessage("");
    clearTimeout(feedbackTimer.current);
    try {
      const mobile = shouldUseNativeShare(navigator.userAgent, navigator.maxTouchPoints, window.matchMedia("(pointer: coarse)").matches);
      if (mobile && navigator.share) {
        try {
          await navigator.share({ text: message });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      await copyShareMessage(message);
      setFeedback("Copied! Ready to share.");
      setSharedMessage(message);
      feedbackTimer.current = setTimeout(() => { setFeedback(""); setSharedMessage(""); }, 10000);
    } catch {
      setFeedback("Couldn’t copy automatically. Copy the message below to share.");
      setSharedMessage(message);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="site-shell">
      <main className="gift-main">
        <section className="intro">
          <h1 className="gift-title">STUPID<br />GIFTS</h1>
        </section>
        <form className="gift-form" onSubmit={findGift}>
          <div className="field-group">
            <label className="field-label" htmlFor="recipient">Gift recipient?</label>
            <Input className="gift-input" id="recipient" placeholder="My partner, my boss, that one friend…" value={recipient} onChange={(event) => setRecipient(event.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="quirk">Their most ridiculous quirk?</label>
            <Input className="gift-input" id="quirk" placeholder="Schedules meetings about meetings…" value={quirk} onChange={(event) => setQuirk(event.target.value)} required />
          </div>
          <Button type="submit" className="gift-submit" disabled={giftMutation.isPending}>
            {giftMutation.isPending ? "Finding a perfectly terrible gift…" : "Find Their Stupid Gift"} <ArrowRight />
          </Button>
        </form>
        {recommendation ? (
          <section className="result-section" ref={resultsRef} aria-label="Gift recommendation">
            {giftMutation.isPending ? (
              <p className="empty-note"><span>Searching the shelves of bad ideas…</span></p>
            ) : giftMutation.isError ? (
              <p className="empty-note"><span>Couldn’t load a gift right now.</span>Try again in a moment.</p>
            ) : !gift ? (
              <p className="empty-note"><span>The shelf is empty.</span>No gifts in the collection yet — check back soon.</p>
            ) : (
              <article className="gift-card">
                {gift.image_url && !imageFailed ? (
                  <img className="product-image" src={gift.image_url} alt={gift.name ?? "Gift photo"} width={1024} height={1024} loading="lazy" onError={() => setImageFailed(true)} />
                ) : (
                  <div className="product-image product-image-placeholder" role="img" aria-label="No gift photo available">No photo.<br />Use your imagination.</div>
                )}
                <div className="gift-details">
                  <h3 className="product-title">{gift.name ?? "A Mysterious Stupid Gift"}</h3>
                  <p className="product-description">
                    For {recommendation.recipient}, whose signature move is “{recommendation.quirk}.”{gift.description ? ` ${gift.description}.` : ""}
                  </p>
                  <div className="action-row">
                    {gift.purchase_url ? (
                      <Button className="purchase-button" asChild><a href={gift.purchase_url} target="_blank" rel="noopener noreferrer">Buy This Stupid Gift <ArrowUpRight /></a></Button>
                    ) : null}
                    <Button variant="outline" className="share-button" onClick={shareGift} disabled={sharing}><Share2 /> Share This Stupid Gift</Button>
                  </div>
                  <div className="review-area">
                    <div className="review-heading"><span className="review-stars" aria-label="5 out of 5 stars">★★★★★</span><span className="review-label">FICTIONAL REVIEW</span></div>
                    {gift.fictional_review ? (
                      <>
                        <Button type="button" variant="link" className="review-toggle" aria-expanded={reviewOpen} aria-controls="fictional-review" onClick={() => setReviewOpen(!reviewOpen)}>{reviewOpen ? "Hide review" : "Read review"}{reviewOpen ? <ChevronUp /> : <ChevronDown />}</Button>
                        <div id="fictional-review" hidden={!reviewOpen}><blockquote className="review-text">“{gift.fictional_review}”<cite className="review-author">— A very satisfied imaginary customer</cite></blockquote></div>
                      </>
                    ) : (
                      <p className="review-author">No review yet. The imaginary customers are speechless.</p>
                    )}
                  </div>
                </div>
              </article>
            )}
            <div className="share-feedback" role="status" aria-live="polite">{feedback}{sharedMessage && <p className="share-message">{sharedMessage}</p>}</div>
          </section>
        ) : null}
      </main>
      <footer className="site-footer"><span>STUPID GIFTS © {new Date().getFullYear()}</span><span>Bad presents. Good stories.</span></footer>
    </div>
  );
}
