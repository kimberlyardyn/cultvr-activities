"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Tell me about an achievement, activity, essay idea, or college task. I can help turn it into notes, goals, and next steps.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isPending) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });
        const data = await response.json();

        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              data.message ??
              "I could not generate a response. Check your OpenAI configuration.",
          },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: "Chat is unavailable right now. Check the API route logs.",
          },
        ]);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div className="max-h-[28rem] min-h-72 overflow-y-auto rounded-lg border border-black/10 bg-[#fbfaf6] p-4">
        <div className="grid gap-3">
          {messages.map((message, index) => (
            <div
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-[#2f5d46] px-4 py-3 text-sm leading-6 text-white"
                  : "mr-auto max-w-[85%] rounded-lg bg-white px-4 py-3 text-sm leading-6 text-[#26312c] shadow-sm"
              }
              key={`${message.role}-${index}`}
            >
              {message.content}
            </div>
          ))}
          {isPending ? (
            <div className="mr-auto rounded-lg bg-white px-4 py-3 text-sm text-[#65726b] shadow-sm">
              Thinking...
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <textarea
          className="min-h-12 flex-1 resize-none rounded-md border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-[#355c46]"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Brainstorm an activity, goal, essay angle, or next task..."
          value={input}
        />
        <button
          aria-label="Send message"
          className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#17201b] text-white hover:bg-black disabled:opacity-50"
          disabled={isPending}
          onClick={sendMessage}
          type="button"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
