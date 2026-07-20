"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function DesignSystemUnlock() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/design-system/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not unlock design system.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not unlock design system.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="design-system-unlock">
      <h1 className="design-system-unlock__title text-heading-2">
        design system
      </h1>
      <p className="design-system-unlock__hint text-body-regular">
        Enter the access password to view the component gallery.
      </p>
      <form className="design-system-unlock__form" onSubmit={handleSubmit}>
        <InputField
          id="design-system-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          error={Boolean(error)}
          aria-label="Design system password"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
        {error ? (
          <p className="design-system-unlock__error text-button-label" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting || !password}>
          {isSubmitting ? "unlocking…" : "unlock"}
        </Button>
      </form>
    </div>
  );
}
