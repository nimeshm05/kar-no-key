import Loader from "@/components/Loader/Loader";
import "./PageLoader.css";

/** Figma page-transition loader (node 2247:2215): 120px grid. */
export const PAGE_LOADER_BOX_SIZE = 120;
export const PAGE_LOADER_GAP = 6.316;

type PageLoaderProps = {
  label?: string;
  className?: string;
};

export default function PageLoader({
  label = "Loading",
  className,
}: PageLoaderProps) {
  const classes = ["page-loader", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <Loader
        boxSize={PAGE_LOADER_BOX_SIZE}
        gap={PAGE_LOADER_GAP}
        label={label}
      />
    </div>
  );
}
