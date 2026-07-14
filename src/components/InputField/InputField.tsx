import "./InputField.css";

type InputFieldProps = {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  align?: "left" | "center";
  className?: string;
  id?: string;
  name?: string;
  type?: React.HTMLInputTypeAttribute;
  "aria-label"?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "value" | "onChange" | "placeholder" | "disabled" | "type"
>;

export default function InputField({
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  align = "left",
  className,
  id,
  name,
  type = "text",
  "aria-label": ariaLabel,
  ...rest
}: InputFieldProps) {
  const wrapperClasses = [
    "input-field",
    error && "input-field--error",
    disabled && "input-field--disabled",
    align === "center" && "input-field--centered",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      <input
        className="input-field__input text-button-label"
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        {...rest}
      />
    </div>
  );
}
