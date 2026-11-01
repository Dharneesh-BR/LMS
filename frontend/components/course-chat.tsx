"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, RotateCcw, Send, Trash2, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

type Knowledge = { courseId: string; courseTitle: string; enabled: boolean; chatConfigured: boolean; status: string };
type Source = { id: string; title: string; page: number; url: string; quote: string };
type Answer = { answer: string; sources: Source[]; insufficient: boolean; remainingQuestions?: number };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

export function CourseChat() {
  const pathname = usePathname();
  const { apiUser, firebaseUser, loading } = useAuth();
  const match = /^\/(?:programs\/)?courses\/([^/]+)(?:\/lessons\/[^/]+)?\/?$/.exec(pathname);
  if (!match || loading || !apiUser || !firebaseUser) return null;
  return <CourseChatSession key={`${apiUser.id}-${match[1]}`} courseId={match[1]} />;
}

export function CourseChatSession({ courseId }: { courseId: string }) {
  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const pending = useRef<AbortController | null>(null);
  const endpoint = `/api/chat/course/${courseId}`;

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    apiFetch<{ knowledge: Knowledge }>(`${endpoint}/status`, { signal: controller.signal })
      .then((result) => { if (active.current) setKnowledge(result.knowledge); }).catch(() => {});
    return () => { active.current = false; controller.abort(); pending.current?.abort(); };
  }, [endpoint]);

  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "nearest" }); }, [messages, busy]);

  function close() { setOpen(false); trigger.current?.focus(); }

  async function refreshStatus() {
    setStatusBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ knowledge: Knowledge }>(`${endpoint}/status`);
      if (active.current) setKnowledge(result.knowledge);
    } catch { if (active.current) setError("Unable to check document status. Please try again."); }
    finally { if (active.current) setStatusBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (busy || value.length < 2 || knowledge?.status !== "ready") return;
    const previous = messages.slice(-4).map(({ role, content }) => ({ role, content: content.slice(0, 1000) }));
    const userMessage: Message = { role: "user", content: value };
    setMessages((items) => [...items, userMessage]);
    setQuestion("");
    setBusy(true);
    setError("");
    const controller = new AbortController();
    pending.current = controller;
    try {
      const result = await apiFetch<Answer>(`${endpoint}/message`, { method: "POST", signal: controller.signal,
        body: JSON.stringify({ question: value, history: previous, requestId: crypto.randomUUID() }) });
      if (!active.current) return;
      setMessages((items) => [...items, { role: "assistant", content: result.answer, sources: result.sources }]);
      if (result.remainingQuestions !== undefined) setRemaining(result.remainingQuestions);
    } catch (reason) {
      if (!active.current) return;
      setMessages((items) => items.slice(0, -1));
      setQuestion(value);
      setError(reason instanceof Error ? reason.message : "Unable to get an answer. Please try again.");
    } finally {
      if (active.current) setBusy(false);
      pending.current = null;
    }
  }

  if (!knowledge?.enabled || !knowledge.chatConfigured) return null;
  return (
    <>
      <button ref={trigger} type="button" title="Ask about this course" aria-label="Ask about this course" aria-expanded={open}
        aria-controls="course-chat-panel" onClick={() => { setOpen((value) => !value); if (!open) void refreshStatus(); }}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-lg bg-ocean text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean">
        <MessageCircle className="h-6 w-6" />
      </button>
      {open ? (
        <section id="course-chat-panel" role="dialog" aria-label="Course assistant" onKeyDown={(event) => { if (event.key === "Escape") close(); }}
          className="fixed bottom-20 right-4 z-50 flex h-[min(38rem,calc(100dvh-6rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-950 shadow-2xl">
          <header className="flex shrink-0 items-start gap-2 border-b border-gray-200 px-4 py-3">
            <div className="min-w-0 flex-1"><h2 className="text-base font-bold">Course assistant</h2><p className="break-words text-xs text-gray-600">{knowledge.courseTitle}</p></div>
            <button type="button" title="Clear conversation" aria-label="Clear conversation" disabled={busy} onClick={() => { setMessages([]); setQuestion(""); setError(""); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
            <button type="button" title="Close chat" aria-label="Close chat" onClick={close} className="flex h-8 w-8 shrink-0 items-center justify-center rounded"><X className="h-4 w-4" /></button>
          </header>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions">
            {!messages.length ? <p className="text-sm text-gray-600">What would you like to understand about {knowledge.courseTitle}?</p> : null}
            {messages.map((message, index) => (
              <article key={index} className={message.role === "user" ? "border-l-2 border-ocean pl-3" : "border-l-2 border-emerald-500 pl-3"}>
                <p className="mb-1 text-xs font-semibold text-gray-600">{message.role === "user" ? "You" : "Course assistant"}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                {message.sources?.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.quote} className="mt-2 flex items-start gap-1 break-words text-xs font-semibold text-ocean underline">
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /><span className="min-w-0">{source.title}, page {source.page}</span>
                  </a>
                ))}
              </article>
            ))}
            {busy ? <p role="status" className="text-sm text-gray-600">Finding an answer...</p> : null}
            <div ref={end} />
          </div>
          <div className="shrink-0 border-t border-gray-200 p-3">
            {error ? <p role="alert" className="mb-2 break-words text-sm text-red-700">{error}</p> : null}
            {knowledge.status !== "ready" ? (
              <div className="flex items-center gap-2 text-sm text-gray-600"><p className="flex-1">Course documents are not ready for questions yet.</p><button type="button" onClick={refreshStatus} disabled={statusBusy} title="Check document status" aria-label="Check document status" className="flex h-9 w-9 items-center justify-center"><RotateCcw className="h-4 w-4" /></button></div>
            ) : (
              <form onSubmit={submit} className="flex items-end gap-2">
                <textarea ref={field} value={question} maxLength={500} rows={2} onChange={(event) => setQuestion(event.target.value)}
                  aria-label="Question about this course" placeholder="Ask a course question" disabled={busy || remaining === 0}
                  className="min-w-0 flex-1 resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-ocean focus:outline-none" />
                <button type="submit" disabled={busy || question.trim().length < 2 || remaining === 0} title="Send question" aria-label="Send question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-ocean text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </form>
            )}
            {remaining !== null ? <p className="mt-2 text-xs text-gray-600">{remaining} questions remaining today</p> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
