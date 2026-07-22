"use client";

import { useId, useState } from "react";
import Button from "@/components/Button/Button";
import Dialog from "@/components/Dialog/Dialog";
import { getPlayerId } from "@/lib/player/identity";
import { submitFeedback } from "@/lib/supabase/functions";
import "./FeedbackDialog.css";

export type FeedbackDialogPhase = "form" | "success" | "error";

type FeedbackDialogProps = {
  onClose: () => void;
};

const STAR_COUNT = 5;
const MAX_MESSAGE_LENGTH = 2000;

function getDialogTitle(phase: FeedbackDialogPhase): string {
  switch (phase) {
    case "success":
      return "Received";
    case "error":
      return "Error";
    default:
      return "Feedback";
  }
}

export default function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const [phase, setPhase] = useState<FeedbackDialogPhase>("form");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const thoughtsId = useId();
  const ratingLabelId = useId();

  const canSubmit =
    message.trim().length > 0 &&
    rating !== null &&
    rating >= 1 &&
    rating <= STAR_COUNT &&
    !isSubmitting;

  function handleStarClick(value: number) {
    if (isSubmitting) {
      return;
    }

    setRating((current) => (current === value ? null : value));
  }

  async function handleSubmit() {
    if (!canSubmit || rating === null) {
      return;
    }

    setIsSubmitting(true);

    try {
      const playerId = getPlayerId();
      const { data, error } = await submitFeedback(
        playerId,
        message.trim(),
        rating,
      );

      if (error || !data || "error" in data) {
        setPhase("error");
        return;
      }

      setPhase("success");
    } catch {
      setPhase("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRetry() {
    setPhase("form");
  }

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (phase === "form") {
    body = (
      <div className="feedback-dialog__form">
        <div className="feedback-dialog__field">
          <label className="feedback-dialog__label text-button-label" htmlFor={thoughtsId}>
            Your thoughts
          </label>
          <textarea
            id={thoughtsId}
            className="feedback-dialog__textarea text-button-label"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="share your thoughts"
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isSubmitting}
            aria-label="Your thoughts"
          />
        </div>

        <div className="feedback-dialog__field">
          <p id={ratingLabelId} className="feedback-dialog__label text-button-label">
            Rate game
          </p>
          <div
            className="feedback-dialog__stars"
            role="radiogroup"
            aria-labelledby={ratingLabelId}
          >
            {Array.from({ length: STAR_COUNT }, (_, index) => {
              const value = index + 1;
              const selected = rating !== null && value <= rating;

              return (
                <button
                  key={value}
                  type="button"
                  className="feedback-dialog__star"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  disabled={isSubmitting}
                  onClick={() => handleStarClick(value)}
                >
                  <img
                    className="feedback-dialog__star-icon"
                    src={
                      selected
                        ? "/icons/star-rating-selected.svg"
                        : "/icons/star-rating-default.svg"
                    }
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

    footer = (
      <div className="feedback-dialog__actions">
        <Button
          variant="secondary"
          type="button"
          className="feedback-dialog__action"
          disabled={isSubmitting}
          onClick={onClose}
        >
          cancel
        </Button>
        <Button
          variant="primary"
          type="button"
          className="feedback-dialog__action feedback-dialog__action--submit"
          disabled={!canSubmit}
          onClick={() => {
            void handleSubmit();
          }}
        >
          submit
        </Button>
      </div>
    );
  }

  if (phase === "success") {
    body = (
      <div className="feedback-dialog__status">
        <p>Your feedback was submitted successfully.</p>
        <p>Thank you fren :)</p>
      </div>
    );
    footer = (
      <Button
        variant="primary"
        type="button"
        className="feedback-dialog__retry"
        onClick={onClose}
      >
        close
      </Button>
    );
  }

  if (phase === "error") {
    body = (
      <div className="feedback-dialog__status">
        <p>There was an error in receiving your feedback.</p>
        <p>Can you please retry?</p>
      </div>
    );
    footer = (
      <Button
        variant="primary"
        type="button"
        className="feedback-dialog__retry"
        onClick={handleRetry}
      >
        retry
      </Button>
    );
  }

  return (
    <Dialog
      title={getDialogTitle(phase)}
      onClose={onClose}
      ariaBusy={isSubmitting || undefined}
      footer={footer}
    >
      {body}
    </Dialog>
  );
}
