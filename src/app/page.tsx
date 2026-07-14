import TypewriterIllustration from "@/components/TypewriterIllustration/TypewriterIllustration";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
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
      <div className="landing-form">
        <InputField placeholder="Your name" align="center" aria-label="Your name" />
        <Button type="button">get started</Button>
      </div>
    </main>
  );
}
