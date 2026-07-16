import Button from "@/components/Button/Button";
import "./Navbar.css";

type NavbarProps = {
  displayName: string;
  onExitLobby: () => void;
};

export default function Navbar({ displayName, onExitLobby }: NavbarProps) {
  const greetingName = displayName.toLowerCase();

  return (
    <header className="navbar">
      <div className="navbar__content">
        <div className="navbar__section navbar__section--start">
          <Button variant="secondary" type="button" onClick={onExitLobby}>
            exit lobby
          </Button>
        </div>

        <div className="navbar__section navbar__section--center">
          <p className="navbar__greeting text-body">
            hello, {greetingName}.
          </p>
        </div>

        <div className="navbar__section navbar__section--end">
          <Button variant="secondary" type="button">
            feedback
          </Button>
        </div>
      </div>
    </header>
  );
}
