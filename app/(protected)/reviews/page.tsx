"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, EyeOff, MessageSquareMore, ShieldCheck, Sparkles, Star } from "lucide-react";
import toast from "react-hot-toast";
import { reviewApi } from "@/lib/api";
import type { Review } from "@/lib/types";
import { classNames, formatDateTime } from "@/lib/utils";

type ReviewAction = "approve" | "reject" | "hide" | "feature";

export default function ReviewsPage() {
  const detailRef = useRef<HTMLElement | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("Needs moderation");
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<{ reviewId: string; action: ReviewAction } | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await reviewApi.list({ limit: 50 });
      setReviews(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, []);

  useEffect(() => {
    if (!reviews.length) {
      setSelectedReviewId("");
      return;
    }

    if (!selectedReviewId || !reviews.some((review) => review._id === selectedReviewId)) {
      setSelectedReviewId(reviews[0]._id);
    }
  }, [reviews, selectedReviewId]);

  const selectedReview = reviews.find((review) => review._id === selectedReviewId) || reviews[0] || null;

  const reviewInsights = useMemo(() => {
    const pending = reviews.filter((review) => review.status === "pending").length;
    const featured = reviews.filter((review) => review.isFeatured).length;
    const hidden = reviews.filter((review) => review.status === "hidden").length;

    return [
      {
        label: "Visible reviews",
        value: reviews.length,
        detail: "Reviews loaded from the moderation API",
        icon: MessageSquareMore
      },
      {
        label: "Pending review",
        value: pending,
        detail: "Reviews waiting for moderation",
        icon: ShieldCheck
      },
      {
        label: "Featured",
        value: featured,
        detail: "Reviews highlighted across storefront surfaces",
        icon: Sparkles
      },
      {
        label: "Hidden",
        value: hidden,
        detail: "Reviews removed from normal visibility",
        icon: EyeOff
      }
    ];
  }, [reviews]);

  const openReview = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReviewKeyDown = (event: KeyboardEvent<HTMLElement>, reviewId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openReview(reviewId);
    }
  };

  const runAction = async (reviewId: string, action: ReviewAction, handler: () => Promise<unknown>, message: string) => {
    setActiveAction({ reviewId, action });
    try {
      await handler();
      toast.success(message);
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {reviewInsights.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className="panel stat-card metric-card reviews-insight-card"
              onClick={() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <div className="metric-card-head">
                <div className="metric-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
                <span className="reviews-card-action">
                  Open
                  <ArrowRight size={16} />
                </span>
              </div>
              <strong>{item.value}</strong>
              <p className="mini-text">{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="panel stack-md">
        <div className="section-heading">
          <div>
            <h3>Reviews moderation</h3>
            <p>Approve, reject, hide, or feature reviews through the live moderation API.</p>
          </div>
          <button className="ghost-button" type="button" onClick={loadReviews}>
            Refresh reviews
          </button>
        </div>

        <label className="field inline-field">
          <span>Default rejection reason</span>
          <input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
        </label>
        <div className="mini-text">
          This reason is used whenever you reject the selected review.
        </div>
      </section>

      <div className="two-column-grid reviews-dashboard-grid">
        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Moderation queue</h3>
              <p>{loading ? "Loading review activity." : `${reviews.length} reviews ready for moderation.`}</p>
            </div>
          </div>

          <div className="stack-sm">
            {loading ? (
              <div className="empty-state">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="empty-state">No reviews are available for moderation right now.</div>
            ) : (
              reviews.map((review) => {
                const isSelected = selectedReview?._id === review._id;

                return (
                  <article
                    key={review._id}
                    className={classNames("list-card", "vertical", "reviews-list-card", isSelected && "reviews-list-card-selected")}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="reviews-list-selectable"
                      onClick={() => openReview(review._id)}
                      onKeyDown={(event) => handleReviewKeyDown(event, review._id)}
                      aria-label={`Open review ${review.title || review.name}`}
                      aria-pressed={isSelected}
                    >
                      <div className="review-head">
                        <div>
                          <strong>{review.title || review.name || "Untitled review"}</strong>
                          <div className="mini-text">
                            {review.rating}/5 . {review.status} . {formatDateTime(review.createdAt)}
                          </div>
                        </div>
                        <div className="reviews-card-badges">
                          {review.isFeatured ? (
                            <span className="pill feature-pill">
                              <Star size={14} />
                              Featured
                            </span>
                          ) : null}
                          <span
                            className={classNames(
                              "pill",
                              review.status === "approved" ? "status-pill-positive" : "status-pill-muted"
                            )}
                          >
                            {review.status}
                          </span>
                        </div>
                      </div>
                      <p className="mini-text reviews-card-comment">
                        {review.comment || "No comment was provided for this review."}
                      </p>
                      <div className="reviews-card-footer">
                        <span className="reviews-card-hint">
                          {isSelected ? "Currently open in moderation panel" : "Open moderation details"}
                        </span>
                        <span className="reviews-card-action">
                          Open
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section ref={detailRef} className="panel stack-md reviews-detail-panel">
          <div className="section-heading">
            <div>
              <h3>{selectedReview ? selectedReview.title || selectedReview.name || "Review details" : "Review details"}</h3>
              <p>
                {selectedReview
                  ? "Review the content and take moderation action from this panel."
                  : "Select a review from the queue to inspect it here."}
              </p>
            </div>
          </div>

          {!selectedReview ? (
            <div className="empty-state">Choose a review from the moderation queue to inspect it here.</div>
          ) : (
            <div className="stack-md">
              <div className="editor-banner reviews-detail-banner">
                <div className="editor-banner-icon">
                  <MessageSquareMore size={18} />
                </div>
                <div className="stack-sm">
                  <div className="reviews-detail-head">
                    <strong>{selectedReview.title || selectedReview.name || "Untitled review"}</strong>
                    <span className="pill pill-soft">{selectedReview.rating}/5 rating</span>
                  </div>
                  <div className="mini-text">{formatDateTime(selectedReview.createdAt)}</div>
                </div>
              </div>

              <div className="two-column-grid">
                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Reviewer</h4>
                    <p>Identity and moderation context.</p>
                  </div>
                  <div className="stack-sm">
                    <div className="reviews-detail-item">
                      <span>Name</span>
                      <strong>{selectedReview.name || "Anonymous"}</strong>
                    </div>
                    <div className="reviews-detail-item">
                      <span>Email</span>
                      <strong>{selectedReview.email || "No email provided"}</strong>
                    </div>
                    <div className="reviews-detail-item">
                      <span>Status</span>
                      <strong>{selectedReview.status}</strong>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Flags</h4>
                    <p>Current moderation and visibility state.</p>
                  </div>
                  <div className="stack-sm">
                    <div className="reviews-detail-item">
                      <span>Featured</span>
                      <strong>{selectedReview.isFeatured ? "Yes" : "No"}</strong>
                    </div>
                    <div className="reviews-detail-item">
                      <span>Rejection reason</span>
                      <strong>{selectedReview.rejectionReason || "Not rejected"}</strong>
                    </div>
                    <div className="reviews-detail-item">
                      <span>Review id</span>
                      <strong>{selectedReview._id}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <h4>Review content</h4>
                  <p>Original review text from the customer.</p>
                </div>
                <p className="reviews-detail-comment">
                  {selectedReview.comment || "No comment was provided for this review."}
                </p>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <h4>Moderation actions</h4>
                  <p>Apply moderation decisions to the selected review.</p>
                </div>
                <div className="row-actions row-actions-wrap">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "approve",
                        () => reviewApi.approve(selectedReview._id),
                        "Review approved"
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id && activeAction.action === "approve"
                      ? "Approving..."
                      : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "reject",
                        () => reviewApi.reject(selectedReview._id, rejectionReason),
                        "Review rejected"
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id && activeAction.action === "reject"
                      ? "Rejecting..."
                      : "Reject"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "hide",
                        () => reviewApi.hide(selectedReview._id),
                        "Review hidden"
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id && activeAction.action === "hide"
                      ? "Hiding..."
                      : "Hide"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "feature",
                        () => reviewApi.feature(selectedReview._id),
                        "Featured state toggled"
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id && activeAction.action === "feature"
                      ? "Updating..."
                      : selectedReview.isFeatured
                        ? "Remove feature"
                        : "Feature"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
