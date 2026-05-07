"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  EyeOff,
  MessageSquareMore,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { reviewApi } from "@/lib/api";
import type { Review } from "@/lib/types";
import { classNames, formatDateTime } from "@/lib/utils";

type ReviewAction = "approve" | "reject" | "hide" | "feature";

const statusBadgeClass = (status: Review["status"]) =>
  classNames(
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset",
    status === "approved" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
    status === "pending" && "bg-amber-50 text-amber-700 ring-amber-200",
    status === "rejected" && "bg-rose-50 text-rose-700 ring-rose-200",
    status === "hidden" && "bg-slate-100 text-slate-700 ring-slate-200",
    !["approved", "pending", "rejected", "hidden"].includes(status) &&
      "bg-slate-50 text-slate-700 ring-slate-200",
  );

const actionButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const primaryActionButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export default function ReviewsPage() {
  const detailRef = useRef<HTMLElement | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("Needs moderation");
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<{
    reviewId: string;
    action: ReviewAction;
  } | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await reviewApi.list({ limit: 50 });
      setReviews(response.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to fetch reviews",
      );
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

    if (
      !selectedReviewId ||
      !reviews.some((review) => review._id === selectedReviewId)
    ) {
      setSelectedReviewId(reviews[0]._id);
    }
  }, [reviews, selectedReviewId]);

  const selectedReview =
    reviews.find((review) => review._id === selectedReviewId) ||
    reviews[0] ||
    null;

  const reviewInsights = useMemo(() => {
    const pending = reviews.filter(
      (review) => review.status === "pending",
    ).length;
    const featured = reviews.filter((review) => review.isFeatured).length;
    const hidden = reviews.filter(
      (review) => review.status === "hidden",
    ).length;

    return [
      {
        label: "Visible reviews",
        value: reviews.length,
        detail: "Reviews loaded from the moderation API",
        icon: MessageSquareMore,
      },
      {
        label: "Pending review",
        value: pending,
        detail: "Reviews waiting for moderation",
        icon: ShieldCheck,
      },
      {
        label: "Featured",
        value: featured,
        detail: "Reviews highlighted across storefront surfaces",
        icon: Sparkles,
      },
      {
        label: "Hidden",
        value: hidden,
        detail: "Reviews removed from normal visibility",
        icon: EyeOff,
      },
    ];
  }, [reviews]);

  const openReview = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReviewKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    reviewId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openReview(reviewId);
    }
  };

  const runAction = async (
    reviewId: string,
    action: ReviewAction,
    handler: () => Promise<unknown>,
    message: string,
  ) => {
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 sm:px-6 lg:px-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reviewInsights.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() =>
                detailRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {item.label}
                  </span>
                </div>
                <span className="hidden items-center gap-1 text-xs font-semibold text-indigo-600 transition group-hover:translate-x-0.5 sm:inline-flex">
                  Open
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>

              <strong className="mt-5 block text-3xl font-bold tracking-tight text-slate-950">
                {item.value}
              </strong>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.detail}
              </p>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Moderation center
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Reviews moderation
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Approve, reject, hide, or feature reviews through the live
              moderation API.
            </p>
          </div>

          <button
            type="button"
            className={actionButtonClass}
            onClick={loadReviews}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={classNames("mr-2", loading && "animate-spin")}
              aria-hidden="true"
            />
            {loading ? "Refreshing..." : "Refresh reviews"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Default rejection reason
            </span>
            <input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Enter the default reason shown for rejected reviews"
            />
          </label>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500 ring-1 ring-slate-200">
            This reason is used whenever you reject the selected review.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Moderation queue
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading review activity."
                    : `${reviews.length} reviews ready for moderation.`}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Latest 50
              </span>
            </div>
          </div>

          <div className="max-h-none space-y-3 p-4 sm:p-5 xl:max-h-[760px] xl:overflow-y-auto">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                No reviews are available for moderation right now.
              </div>
            ) : (
              reviews.map((review) => {
                const isSelected = selectedReview?._id === review._id;

                return (
                  <article
                    key={review._id}
                    className={classNames(
                      "rounded-2xl border bg-white shadow-sm transition",
                      isSelected
                        ? "border-indigo-300 ring-4 ring-indigo-50"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-md",
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer p-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-5"
                      onClick={() => openReview(review._id)}
                      onKeyDown={(event) =>
                        handleReviewKeyDown(event, review._id)
                      }
                      aria-label={`Open review ${review.title || review.name}`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <strong className="line-clamp-2 block text-base font-bold text-slate-950">
                            {review.title || review.name || "Untitled review"}
                          </strong>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <Star
                                size={13}
                                className="fill-current"
                                aria-hidden="true"
                              />
                              {review.rating}/5
                            </span>
                            <span aria-hidden="true">•</span>
                            <span>{formatDateTime(review.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {review.isFeatured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                              <Star size={13} aria-hidden="true" />
                              Featured
                            </span>
                          ) : null}
                          <span className={statusBadgeClass(review.status)}>
                            {review.status}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {review.comment ||
                          "No comment was provided for this review."}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <span className="text-xs font-medium text-slate-500">
                          {isSelected
                            ? "Currently open in moderation panel"
                            : "Open moderation details"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                          Open
                          <ArrowRight size={16} aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section
          ref={detailRef}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6 xl:self-start"
        >
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {selectedReview
                    ? selectedReview.title ||
                      selectedReview.name ||
                      "Review details"
                    : "Review details"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {selectedReview
                    ? "Review the content and take moderation action from this panel."
                    : "Select a review from the queue to inspect it here."}
                </p>
              </div>
              {selectedReview ? (
                <span className={statusBadgeClass(selectedReview.status)}>
                  {selectedReview.status}
                </span>
              ) : null}
            </div>
          </div>

          {!selectedReview ? (
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                Choose a review from the moderation queue to inspect it here.
              </div>
            </div>
          ) : (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                    <MessageSquareMore size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <strong className="line-clamp-2 text-lg font-bold text-slate-950">
                        {selectedReview.title ||
                          selectedReview.name ||
                          "Untitled review"}
                      </strong>
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        <Star
                          size={13}
                          className="fill-current"
                          aria-hidden="true"
                        />
                        {selectedReview.rating}/5 rating
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {formatDateTime(selectedReview.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div>
                    <h4 className="text-base font-bold text-slate-950">
                      Reviewer
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Identity and moderation context.
                    </p>
                  </div>
                  <dl className="mt-5 space-y-3">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Name
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {selectedReview.name || "Anonymous"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {selectedReview.email || "No email provided"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </dt>
                      <dd className="mt-2">
                        <span
                          className={statusBadgeClass(selectedReview.status)}
                        >
                          {selectedReview.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div>
                    <h4 className="text-base font-bold text-slate-950">
                      Flags
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Current moderation and visibility state.
                    </p>
                  </div>
                  <dl className="mt-5 space-y-3">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Featured
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedReview.isFeatured ? "Yes" : "No"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Rejection reason
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {selectedReview.rejectionReason || "Not rejected"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Review id
                      </dt>
                      <dd className="mt-1 break-all text-xs font-semibold text-slate-700 sm:text-sm">
                        {selectedReview._id}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div>
                  <h4 className="text-base font-bold text-slate-950">
                    Review content
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Original review text from the customer.
                  </p>
                </div>
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 ring-1 ring-slate-200">
                  {selectedReview.comment ||
                    "No comment was provided for this review."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-950">
                      Moderation actions
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Apply moderation decisions to the selected review.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    type="button"
                    className={primaryActionButtonClass}
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "approve",
                        () => reviewApi.approve(selectedReview._id),
                        "Review approved",
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id &&
                    activeAction.action === "approve"
                      ? "Approving..."
                      : "Approve"}
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "reject",
                        () =>
                          reviewApi.reject(selectedReview._id, rejectionReason),
                        "Review rejected",
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id &&
                    activeAction.action === "reject"
                      ? "Rejecting..."
                      : "Reject"}
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "hide",
                        () => reviewApi.hide(selectedReview._id),
                        "Review hidden",
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id &&
                    activeAction.action === "hide"
                      ? "Hiding..."
                      : "Hide"}
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={Boolean(activeAction)}
                    onClick={() =>
                      void runAction(
                        selectedReview._id,
                        "feature",
                        () => reviewApi.feature(selectedReview._id),
                        "Featured state toggled",
                      )
                    }
                  >
                    {activeAction?.reviewId === selectedReview._id &&
                    activeAction.action === "feature"
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
