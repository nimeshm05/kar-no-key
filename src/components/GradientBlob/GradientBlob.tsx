import "./GradientBlob.css";

export default function GradientBlob() {
  return (
    <div className="gradient-blob" aria-hidden="true">
      <img
        className="gradient-blob__image"
        src="/gradient-blob.svg"
        alt=""
        width={700}
        height={500}
      />
    </div>
  );
}
