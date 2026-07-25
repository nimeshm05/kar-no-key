"use client";

import { useState } from "react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import Button from "@/components/Button/Button";
import Dialog from "@/components/Dialog/Dialog";
import Dropdown from "@/components/Dropdown/Dropdown";
import Heading from "@/components/Heading/Heading";
import IconButton from "@/components/IconButton/IconButton";
import InputField from "@/components/InputField/InputField";
import Loader from "@/components/Loader/Loader";
import Navbar from "@/components/Navbar/Navbar";
import PageLoader, {
  PAGE_LOADER_BOX_SIZE,
  PAGE_LOADER_GAP,
} from "@/components/PageLoader/PageLoader";
import PhraseTypingArea from "@/components/PhraseTypingArea/PhraseTypingArea";
import SongCard from "@/components/SongCard/SongCard";
import Tabs from "@/components/Tabs/Tabs";
import type { LobbyPlayer, SongResult } from "@/lib/supabase/functions";

const SAMPLE_SONG: SongResult = {
  id: "sample-song",
  title: "Sample Track",
  artist: "Demo Artist",
  channel: "Demo Channel",
  thumbnail_url: undefined,
  duration_sec: 214,
  has_lyrics: true,
};

const SAMPLE_PLAYERS: LobbyPlayer[] = [
  {
    player_id: "host-1",
    display_name: "nimesh",
    is_host: true,
    is_connected: true,
    score: 1200,
  },
  {
    player_id: "player-2",
    display_name: "alex",
    is_host: false,
    is_connected: true,
    score: 800,
  },
  {
    player_id: "player-3",
    display_name: "sam",
    is_host: false,
    is_connected: false,
    score: 450,
  },
];

const COLOR_SWATCHES = [
  { name: "--color-background", variable: "var(--color-background)" },
  { name: "--color-foreground", variable: "var(--color-foreground)" },
  { name: "--color-text-primary", variable: "var(--color-text-primary)" },
  { name: "--color-text-muted", variable: "var(--color-text-muted)" },
  { name: "--color-text-placeholder", variable: "var(--color-text-placeholder)" },
  { name: "--color-button-background", variable: "var(--color-button-background)" },
  { name: "--color-button-foreground", variable: "var(--color-button-foreground)" },
  {
    name: "--color-button-secondary-background",
    variable: "var(--color-button-secondary-background)",
  },
  { name: "--color-input-border", variable: "var(--color-input-border)" },
  { name: "--color-input-border-error", variable: "var(--color-input-border-error)" },
  { name: "--color-text-error", variable: "var(--color-text-error)" },
  { name: "--color-accent-green", variable: "var(--color-accent-green)" },
  { name: "--color-heading-border", variable: "var(--color-heading-border)" },
  { name: "--color-heading-shadow", variable: "var(--color-heading-shadow)" },
  { name: "--color-heading-text", variable: "var(--color-heading-text)" },
  { name: "--neutral-100", variable: "var(--neutral-100)" },
  { name: "--neutral-300", variable: "var(--neutral-300)" },
  { name: "--neutral-400", variable: "var(--neutral-400)" },
  { name: "--neutral-700", variable: "var(--neutral-700)" },
  { name: "--blue-500", variable: "var(--blue-500)" },
  { name: "--red-500", variable: "var(--red-500)" },
  { name: "--emerald-400", variable: "var(--emerald-400)" },
  { name: "--emerald-600", variable: "var(--emerald-600)" },
];

const TYPE_SAMPLES = [
  { className: "text-heading-1", label: "text-heading-1" },
  { className: "text-heading-2", label: "text-heading-2" },
  { className: "text-heading-3", label: "text-heading-3" },
  { className: "text-body", label: "text-body" },
  { className: "text-body-regular", label: "text-body-regular" },
  { className: "text-button-label", label: "text-button-label" },
];

export default function DesignSystemGallery() {
  const [inputValue, setInputValue] = useState("hello");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState("race your");
  const [activeTab, setActiveTab] = useState("recommended");

  return (
    <div className="design-system-gallery">
      <header className="design-system-gallery__header">
        <Heading as="h1" size="1">
          design system
        </Heading>
        <p className="design-system-gallery__subtitle text-body-regular">
          Private component gallery. Edit locally with npm run dev to preview
          changes.
        </p>
      </header>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Tokens
        </Heading>
        <Heading as="h3" size="3" className="design-system-section__subtitle">
          Colors
        </Heading>
        <div className="design-system-swatches">
          {COLOR_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="design-system-swatch">
              <div
                className="design-system-swatch__chip"
                style={{ background: swatch.variable }}
                aria-hidden="true"
              />
              <p className="design-system-swatch__name text-button-label">
                {swatch.name}
              </p>
            </div>
          ))}
        </div>
        <Heading as="h3" size="3" className="design-system-section__subtitle">
          Typography
        </Heading>
        <div className="design-system-type-samples">
          {TYPE_SAMPLES.map((sample) => (
            <p key={sample.label} className={sample.className}>
              {sample.label} — The quick brown fox
            </p>
          ))}
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Heading
        </Heading>
        <div className="design-system-row">
          <Heading as="h1" size="1">
            heading 1
          </Heading>
          <Heading as="h2" size="2">
            heading 2
          </Heading>
          <Heading as="h3" size="3">
            heading 3
          </Heading>
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Button
        </Heading>
        <div className="design-system-row">
          <Button variant="primary">primary</Button>
          <Button variant="secondary">secondary</Button>
          <Button variant="primary" disabled>
            disabled
          </Button>
          <Button href="#button-link" variant="secondary">
            as link
          </Button>
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          IconButton
        </Heading>
        <div className="design-system-row">
          <IconButton
            iconSrc="/icons/play_arrow.svg"
            iconAlt="Play"
            variant="primary"
          />
          <IconButton
            iconSrc="/icons/pause.svg"
            iconAlt="Pause"
            variant="secondary"
          />
          <IconButton
            iconSrc="/icons/log-out.svg"
            iconAlt="Log out"
            variant="primary"
            disabled
          />
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          InputField
        </Heading>
        <div className="design-system-stack">
          <InputField
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="default"
            aria-label="Default input"
          />
          <InputField
            value="error state"
            error
            placeholder="error"
            aria-label="Error input"
            readOnly
          />
          <InputField
            value="disabled"
            disabled
            placeholder="disabled"
            aria-label="Disabled input"
          />
          <InputField
            value="centered"
            align="center"
            placeholder="center"
            aria-label="Centered input"
            readOnly
          />
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Dropdown
        </Heading>
        <div className="design-system-row design-system-row--dropdown">
          <Dropdown
            label="players"
            countBadge="03"
            isOpen={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
          >
            <div className="dropdown__row" role="menuitem">
              <span className="dropdown__row-name text-button-label">nimesh</span>
              <span className="dropdown__row-meta text-button-label">host</span>
            </div>
            <div className="dropdown__row" role="menuitem">
              <span className="dropdown__row-name text-button-label">alex</span>
            </div>
            <div className="dropdown__row" role="menuitem">
              <span className="dropdown__row-name text-button-label">sam</span>
            </div>
          </Dropdown>
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Dialog
        </Heading>
        <div className="design-system-row">
          <Button type="button" onClick={() => setIsDialogOpen(true)}>
            open dialog
          </Button>
        </div>
        {isDialogOpen ? (
          <Dialog
            title="example dialog"
            onClose={() => setIsDialogOpen(false)}
            footer={
              <Button type="button" onClick={() => setIsDialogOpen(false)}>
                got it
              </Button>
            }
          >
            <p className="text-body-regular">
              This is a sample dialog body for the design system gallery.
            </p>
          </Dialog>
        ) : null}
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Tabs
        </Heading>
        <Tabs
          aria-label="Song source"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: "recommended", label: "Recommended Songs" },
            { id: "youtube", label: "Search Youtube" },
          ]}
        />
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          SongCard
        </Heading>
        <div className="design-system-song-cards">
          <SongCard
            song={SAMPLE_SONG}
            isSelected={selectedSong}
            onSelect={() => setSelectedSong((current) => !current)}
            durationLabel="03:34"
            lyricsStatus="available"
          />
          <SongCard
            song={{
              ...SAMPLE_SONG,
              id: "sample-song-2",
              title: "Another Track",
              has_lyrics: false,
            }}
            durationLabel="02:10"
            lyricsStatus="unavailable"
          />
          <SongCard isLoading />
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          AnimatedEllipsis
        </Heading>
        <AnimatedEllipsis
          label="waiting for the host"
          className="text-body"
          live
          as="p"
        />
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Loader
        </Heading>
        <p className="design-system-section__hint text-body">
          4×4 pixel grid (Figma 2246:2075). Opacity-only pulse; pauses when
          offscreen.
        </p>
        <div className="design-system-loader-row">
          <div className="design-system-loader-demo">
            <span className="design-system-loader-demo__label text-body">
              default (38px)
            </span>
            <Loader />
          </div>
          <div className="design-system-loader-demo">
            <span className="design-system-loader-demo__label text-body">
              page transition (120px)
            </span>
            <Loader boxSize={PAGE_LOADER_BOX_SIZE} gap={PAGE_LOADER_GAP} />
          </div>
          <div className="design-system-loader-demo">
            <span className="design-system-loader-demo__label text-body">
              80px (boxSize=80)
            </span>
            <Loader boxSize={80} />
          </div>
          <div className="design-system-loader-demo">
            <span className="design-system-loader-demo__label text-body">
              slower (speed=0.5)
            </span>
            <Loader speed={0.5} />
          </div>
          <div className="design-system-loader-demo">
            <span className="design-system-loader-demo__label text-body">
              larger (size=12, gap=3)
            </span>
            <Loader size={12} gap={3} />
          </div>
          <div className="design-system-loader-demo">
            <span className="design-system-loader-demo__label text-body">
              paused
            </span>
            <Loader paused />
          </div>
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          PageLoader
        </Heading>
        <p className="design-system-section__hint text-body">
          Full-viewport centered loader for screen transitions (Figma
          2247:2076).
        </p>
        <div className="design-system-page-loader-frame">
          <PageLoader label="Loading page" />
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          Navbar
        </Heading>
        <div className="design-system-navbar-frame">
          <Navbar
            displayName="nimesh"
            players={SAMPLE_PLAYERS}
            onExitLobby={() => undefined}
          />
        </div>
      </section>

      <section className="design-system-section">
        <Heading as="h2" size="2">
          PhraseTypingArea
        </Heading>
        <div className="design-system-phrase-frame">
          <PhraseTypingArea
            phraseText="race your frens"
            typedText={typedPhrase}
            onTypedTextChange={setTypedPhrase}
            isLocked={false}
          />
        </div>
      </section>
    </div>
  );
}
