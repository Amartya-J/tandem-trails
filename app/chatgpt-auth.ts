import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };

const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!userId || !email) return null;
  const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
  const isEncoded = requestHeaders.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8";
  let fullName: string | null = null;
  if (encodedName && isEncoded) { try { fullName = decodeURIComponent(encodedName); } catch {} }
  return { userId, email, fullName, displayName: fullName || email };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
