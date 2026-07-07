import { cookies } from "next/headers";

export const SESSION_COOKIE = "lindra_session";

// Batas keamanan draf: cookie sesi httpOnly harus cocok dengan sessionId di URL
export async function guardSession(sessionId: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === sessionId;
}
