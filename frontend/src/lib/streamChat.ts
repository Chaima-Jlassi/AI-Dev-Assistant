export type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${(import.meta.env.VITE_AGENT_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:18000"}/api/chat`;

export async function streamChat({
  messages,
  goal,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  goal?: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, goal }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    const errorMsg = data.error || `Request failed (${resp.status})`;
    onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  const data = await resp.json().catch(() => ({}));
  const reply = typeof data.reply === "string" ? data.reply : "";
  if (!reply) {
    const errorMsg = data.error || "Empty response from assistant";
    onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  onDelta(reply);
  onDone();
}
