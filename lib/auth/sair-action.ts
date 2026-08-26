"use server";

import { signOut } from "@/auth";

/** Server action de logout usada pelo shell (components/AppFrame.tsx). */
export async function sairAction() {
  await signOut({ redirectTo: "/" });
}
