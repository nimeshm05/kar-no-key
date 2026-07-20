import { cookies } from "next/headers";
import {
  DESIGN_SYSTEM_COOKIE_NAME,
  getDesignSystemPassword,
  verifyDesignSystemAccessToken,
} from "./access";

export async function isDesignSystemUnlocked(): Promise<boolean> {
  const password = getDesignSystemPassword();
  if (!password) {
    return false;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(DESIGN_SYSTEM_COOKIE_NAME)?.value;
  return verifyDesignSystemAccessToken(token, password);
}
