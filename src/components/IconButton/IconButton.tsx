import "./IconButton.css";

type IconButtonProps = {
  iconSrc: string;
  iconAlt: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
};

export default function IconButton({
  iconSrc,
  iconAlt,
  onClick,
  type = "button",
  variant = "primary",
  className,
  disabled = false,
}: IconButtonProps) {
  const classes = [
    "icon-button",
    `icon-button--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={iconAlt}
    >
      <img className="icon-button__icon" src={iconSrc} alt="" aria-hidden="true" />
    </button>
  );
}
