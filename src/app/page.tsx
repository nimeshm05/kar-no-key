import TypewriterIllustration from "@/components/TypewriterIllustration/TypewriterIllustration";
import Button from "@/components/Button/Button";
import "./page.css";

export default function Home() {
  return (
    <main className="landing-page">
      <div className="typewriter-container">
        <TypewriterIllustration
          className="typewriter-image"
          role="img"
          aria-label="Illustration of a typewriter surrounded by music notes"
        />
        <div className="text-container">
          <h1 className="landing-title text-heading-1">kar-no-key</h1>
          <p className="landing-tagline text-body">race your frens, one lyric at a time :)</p>
        </div>
      </div>
      <Button href="/name">get started</Button>
    </main>
  );
}
