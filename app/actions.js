"use server";

import { revalidatePath } from "next/cache";

export async function revalidateRequestStatus() {
  revalidatePath("/request-status");
}
