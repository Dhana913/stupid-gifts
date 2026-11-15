import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronUp, Gift, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import timerImage from "@/assets/toilet-timer.jpg";
import { buildShareMessage, copyShareMessage, shouldUseNativeShare } from "@/lib/gift-sharing";

const sampleGift = {
  id: "sample-toilet-timer",
  name: "Toilet Timer",
  image: timerImage,
  purchaseUrl: "https://www.amazon.com/s?k=toilet+timer",
  review: "Finally, a clock that understands my throne. My family has started timing my bathroom breaks. I have started timing their patience. Five stars. Would procrastinate again.",
};

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
  const [feedback, setFeedback] = useState("");
  const [sharedMessage, setSharedMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  function findGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient.trim() || !quirk.trim()) return;
    setRecommendation({ recipient: recipient.trim(), quirk: quirk.trim() });
    setReviewOpen(false);
    setFeedback("");
    setSharedMessage("");
    clearTimeout(feedbackTimer.current);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "instant", block: "start" }));
  }

  async function shareGift() {
    if (!recommendation || sharing) return;
    const message = buildShareMessage(recommendation.recipient, sampleGift.name, window.location.origin);
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
      <header className="site-header">
        <div className="brand-mark"><Gift size={20} strokeWidth={1.8} /> STUPID GIFTS</div>
        <span className="header-note">Excellent taste. Questionable judgment.</span>
      </header>
      <main className="gift-main">
        <section className="intro">
          <p className="eyebrow">Good intentions. Terrible gifts.</p>
          <h1 className="gift-title">STUPID<br />GIFTS<span aria-hidden="true">.</span></h1>
          <p className="intro-copy">For the people you love.<br /><strong>And the things about them you don’t.</strong></p>
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
          <Button type="submit" className="gift-submit">Find Their Stupid Gift <ArrowRight /></Button>
          <p className="form-note">Thoughtful gifts are overrated.</p>
        </form>
        {recommendation ? (
          <section className="result-section" ref={resultsRef} aria-label="Gift recommendation">
            <div className="result-heading"><h2>A perfectly terrible choice.</h2><span className="sample-label">SAMPLE GIFT</span></div>
            <article className="gift-card">
              <img className="product-image" src={sampleGift.image} alt="Sample Toilet Timer: a miniature white toilet with a black-sand hourglass" width={1024} height={1024} loading="lazy" />
              <div className="gift-details">
                <p className="product-category">UNNECESSARY. UNFORGETTABLE.</p>
                <h3 className="product-title">{sampleGift.name}</h3>
                <p className="product-description">For {recommendation.recipient}, whose signature move is “{recommendation.quirk}.” A tiny throne that measures time, not progress. Because nothing says “I appreciate you” like putting a countdown on their nonsense.</p>
                <Button className="purchase-button" asChild><a href={sampleGift.purchaseUrl} target="_blank" rel="noopener noreferrer">Buy This Stupid Gift <ArrowUpRight /></a></Button>
                <p className="product-disclaimer">Demo gift & image · Purchase link opens an Amazon search.</p>
                <div className="review-area">
                  <div className="review-heading"><span className="review-stars" aria-label="5 out of 5 stars">★★★★★</span><span className="review-label">FICTIONAL REVIEW</span></div>
                  <Button type="button" variant="link" className="review-toggle" aria-expanded={reviewOpen} aria-controls="fictional-review" onClick={() => setReviewOpen(!reviewOpen)}>{reviewOpen ? "Hide review" : "Read review"}{reviewOpen ? <ChevronUp /> : <ChevronDown />}</Button>
                  <div id="fictional-review" hidden={!reviewOpen}><blockquote className="review-text">“{sampleGift.review}”<cite className="review-author">— A very satisfied imaginary customer</cite></blockquote></div>
                </div>
              </div>
            </article>
            <Button variant="outline" className="share-button" onClick={shareGift} disabled={sharing}><Share2 /> Share This Stupid Gift</Button>
            <div className="share-feedback" role="status" aria-live="polite">{feedback}{sharedMessage && <p className="share-message">{sharedMessage}</p>}</div>
          </section>
        ) : <p className="empty-note"><span aria-hidden="true">↓</span><br />Someone’s about to be very underwhelmed.</p>}
      </main>
      <footer className="site-footer"><span>STUPID GIFTS © {new Date().getFullYear()}</span><span>Bad presents. Good stories.</span></footer>
    </div>
  );
}
