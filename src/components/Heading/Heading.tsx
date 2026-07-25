import "./Heading.css";

type HeadingProps = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "1" | "2" | "3";
  className?: string;
};

export default function Heading({
  children,
  as: Tag = "h1",
  size = "2",
  className,
}: HeadingProps) {
  const classes = ["heading", `text-heading-${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes}>
      <span className="heading__label">{children}</span>
    </Tag>
  );
}
