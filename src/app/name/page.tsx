"use client";

import { useState } from "react";
import Button from "@/components/Button/Button";
import MusicNoteDecorations from "@/components/MusicNoteDecorations/MusicNoteDecorations";
import "./page.css";

export default function NamePage() {
  const [name, setName] = useState("");

  return (
    <main className="name-page">
      <MusicNoteDecorations />
      <div className="name-page-content">
        <div className="name-input-container">
          <textarea
            className="name-input text-heading-1"
            placeholder="what name do you vibe with?"
            rows={2}
            value={name}
            onChange={(event) => setName(event.target.value.replace(/\n/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
            aria-label="Name"
          />
        </div>
        <Button type="button">generate code</Button>
      </div>
    </main>
  );
}
