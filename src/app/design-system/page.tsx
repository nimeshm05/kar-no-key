import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDesignSystemPassword } from "@/lib/design-system/access";
import { isDesignSystemUnlocked } from "@/lib/design-system/session";
import DesignSystemGallery from "./DesignSystemGallery";
import DesignSystemUnlock from "./DesignSystemUnlock";
import "./design-system.css";

export const metadata: Metadata = {
  title: "Design System",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DesignSystemPage() {
  const password = getDesignSystemPassword();

  if (!password && process.env.NODE_ENV === "production") {
    notFound();
  }

  const unlocked = await isDesignSystemUnlocked();

  return (
    <main className="design-system-page">
      {unlocked ? <DesignSystemGallery /> : <DesignSystemUnlock />}
    </main>
  );
}
