import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Bot, User, Plus, Download, ExternalLink, Trash2 } from "lucide-react";
import { streamChat, type Msg } from "@/lib/streamChat";
import ReactMarkdown from "react-markdown";

const WELCOME: Msg = {
  role: "assistant",
  content:
    "👋 Let's build this together.\n\nStart with your **project idea** (even rough notes are fine), and I’ll help fill in gaps.",
};

type DiscussionGoal = "readme" | "architecture" | "uml" | "recommendation";
type IntakeStep = "projectIdea" | "goal" | "details" | "ready";

type IntakeState = {
  step: IntakeStep;
  projectIdea: string;
  goal: DiscussionGoal | "";
  details: string[];
};

type ConversationSession = {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
  intake: IntakeState;
};

const STORAGE_KEY = "agent-conversations-v2";
const MAX_CONVERSATIONS = 20;
const AGENT_BASE_URL =
  ((import.meta.env.VITE_AGENT_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:18000");

const GOAL_OPTIONS: Array<{ value: DiscussionGoal; label: string }> = [
  { value: "readme", label: "README file" },
  { value: "architecture", label: "Architecture design" },
  { value: "uml", label: "UML diagrams" },
  { value: "recommendation", label: "Recommendations" },
];

const defaultIntake = (): IntakeState => ({
  step: "projectIdea",
  projectIdea: "",
  goal: "",
  details: [],
});

const isMsg = (value: unknown): value is Msg => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { role?: unknown; content?: unknown };
  return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
};

const normalizeGoal = (value: unknown): DiscussionGoal | "" => {
  if (value === "readme" || value === "architecture" || value === "uml" || value === "recommendation") return value;
  return "";
};

const normalizeIntake = (value: unknown, messages: Msg[]): IntakeState => {
  if (!value || typeof value !== "object") {
    return messages.length > 0 ? { ...defaultIntake(), step: "ready" } : defaultIntake();
  }
  const candidate = value as { step?: unknown; projectIdea?: unknown; goal?: unknown; details?: unknown };
  const rawStep = candidate.step;
  const step: IntakeStep =
    rawStep === "projectIdea" || rawStep === "goal" || rawStep === "details" || rawStep === "ready"
      ? rawStep
      : (messages.length > 0 ? "ready" : "projectIdea");
  const details = Array.isArray(candidate.details)
    ? candidate.details.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return {
    step,
    projectIdea: typeof candidate.projectIdea === "string" ? candidate.projectIdea : "",
    goal: normalizeGoal(candidate.goal),
    details,
  };
};

const buildConversationTitle = (messages: Msg[]): string => {
  const firstUserMessage = messages.find((message) => message.role === "user" && message.content.trim().length > 0);
  if (!firstUserMessage) return "New discussion";
  const compact = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return compact.length > 60 ? `${compact.slice(0, 60)}…` : compact;
};

const createConversation = (messages: Msg[] = []): ConversationSession => {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: buildConversationTitle(messages),
    messages,
    updatedAt: Date.now(),
    intake: defaultIntake(),
  };
};

const upsertConversations = (
  conversations: ConversationSession[],
  updatedConversation: ConversationSession,
): ConversationSession[] => {
  const withoutCurrent = conversations.filter((conversation) => conversation.id !== updatedConversation.id);
  return [updatedConversation, ...withoutCurrent]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);
};

const parseStoredConversations = (rawValue: string | null): ConversationSession[] => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as {
          id?: unknown;
          title?: unknown;
          messages?: unknown;
          updatedAt?: unknown;
          intake?: unknown;
        };
        if (typeof candidate.id !== "string") return null;
        const messages = Array.isArray(candidate.messages) ? candidate.messages.filter(isMsg) : [];
        const title =
          typeof candidate.title === "string" && candidate.title.trim().length > 0
            ? candidate.title.trim()
            : buildConversationTitle(messages);
        const updatedAt =
          typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt)
            ? candidate.updatedAt
            : Date.now();
        return {
          id: candidate.id,
          title,
          messages,
          updatedAt,
          intake: normalizeIntake(candidate.intake, messages),
        };
      })
      .filter((conversation): conversation is ConversationSession => Boolean(conversation));

    return normalized.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
};

const resolveMediaUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${AGENT_BASE_URL}${trimmed}`;
  return `${AGENT_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
};

const getInitialChatState = (): { conversations: ConversationSession[]; activeConversationId: string } => {
  if (typeof window === "undefined") {
    const fresh = createConversation();
    return { conversations: [fresh], activeConversationId: fresh.id };
  }
  const restored = parseStoredConversations(window.localStorage.getItem(STORAGE_KEY));
  if (restored.length > 0) {
    return { conversations: restored, activeConversationId: restored[0].id };
  }
  const fresh = createConversation();
  return { conversations: [fresh], activeConversationId: fresh.id };
};

const hasAnyKeyword = (text: string, keywords: string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

const assessMissingInfo = (intake: IntakeState): string[] => {
  const missing: string[] = [];
  const projectIdea = intake.projectIdea.trim();
  const fullContext = `${projectIdea}\n${intake.details.join("\n")}`.toLowerCase();

  if (projectIdea.length < 20) {
    missing.push("A little more about what it does and who uses it.");
  }

  if (!intake.goal) {
    missing.push("Select the discussion goal from the dropdown.");
    return missing;
  }

  if (intake.goal === "readme") {
    if (!hasAnyKeyword(fullContext, ["react", "node", "python", "java", "typescript", "flask", "api", "database"])) {
      missing.push("Tech stack hints (language/framework/API/database).");
    }
    if (!hasAnyKeyword(fullContext, ["feature", "user", "flow", "use case", "module", "functionality"])) {
      missing.push("Main features or user flows.");
    }
  }

  if (intake.goal === "architecture") {
    if (!hasAnyKeyword(fullContext, ["frontend", "backend", "service", "api", "database", "queue", "auth"])) {
      missing.push("Main components/services and what each one does.");
    }
    if (!hasAnyKeyword(fullContext, ["scale", "performance", "security", "latency", "availability", "constraint"])) {
      missing.push("Any constraints (performance, scale, security, timeline, etc.).");
    }
  }

  if (intake.goal === "uml") {
    if (!hasAnyKeyword(fullContext, ["class", "sequence", "activity", "state", "component", "use case", "er"])) {
      missing.push("Preferred UML type (class, sequence, activity, component, etc.).");
    }
    if (!hasAnyKeyword(fullContext, ["actor", "entity", "service", "step", "flow", "relationship"])) {
      missing.push("Main actors/entities/components and interactions.");
    }
  }

  if (intake.goal === "recommendation") {
    if (!hasAnyKeyword(fullContext, ["problem", "challenge", "issue", "decision", "trade-off", "constraint"])) {
      missing.push("Current challenge or decision point.");
    }
    if (!hasAnyKeyword(fullContext, ["goal", "deadline", "team", "budget", "time", "priority"])) {
      missing.push("Context limits (team, timeline, priorities, budget).");
    }
  }

  return missing;
};

const goalLabel = (goal: DiscussionGoal): string => {
  const option = GOAL_OPTIONS.find((item) => item.value === goal);
  return option?.label ?? goal;
};

const buildAssumptions = (missing: string[], intake: IntakeState): string[] => {
  if (missing.length === 0) return [];
  const assumptions = [
    "Infer sensible defaults for missing details and continue instead of blocking.",
    "If actors/entities/components are missing, propose a practical baseline set and use it.",
    "Keep the tone friendly and collaborative, not overly formal.",
  ];
  if (intake.goal === "uml") {
    assumptions.push("When unsure, default to one class diagram and one sequence diagram with clearly named actors/services.");
  }
  if (intake.goal === "architecture") {
    assumptions.push("When unsure, propose a common web architecture (frontend, API service, database, auth, optional cache).");
  }
  return assumptions;
};

const buildDeliveryPrompt = (intake: IntakeState, missing: string[] = []): string => {
  const detailsBlock = intake.details.length > 0 ? intake.details.map((d, i) => `${i + 1}. ${d}`).join("\n") : "None";
  const assumptions = buildAssumptions(missing, intake);
  const assumptionsBlock = assumptions.length > 0 ? assumptions.map((a, i) => `${i + 1}. ${a}`).join("\n") : "None";
  const missingBlock = missing.length > 0 ? missing.map((m, i) => `${i + 1}. ${m}`).join("\n") : "None";
  return [
    `Project idea: ${intake.projectIdea}`,
    `Goal: ${intake.goal ? goalLabel(intake.goal) : "Not selected"}`,
    `Additional details:\n${detailsBlock}`,
    `Potentially missing details:\n${missingBlock}`,
    `Assumptions to apply if needed:\n${assumptionsBlock}`,
    "Produce the requested output now. Be interactive, friendly, and complete as much as possible without waiting for perfect inputs.",
  ].join("\n\n");
};

const AgentPage = () => {
  const initialChatState = useMemo(() => getInitialChatState(), []);
  const [conversations, setConversations] = useState<ConversationSession[]>(() => initialChatState.conversations);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => initialChatState.activeConversationId);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const visibleMessages = useMemo(
    () => [WELCOME, ...(activeConversation?.messages ?? [])],
    [activeConversation],
  );

  useEffect(() => {
    if (!conversations.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages]);

  const updateConversation = (conversationId: string, mutator: (conversation: ConversationSession) => ConversationSession) => {
    setConversations((prev) => {
      const current = prev.find((conversation) => conversation.id === conversationId);
      if (!current) return prev;
      const updated = mutator(current);
      return upsertConversations(prev, { ...updated, updatedAt: Date.now() });
    });
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (id === activeConversationId) {
        const next = remaining[0] ?? createConversation();
        setActiveConversationId(next.id);
        if (!remaining.length) return [next];
      }
      return remaining;
    });
  };

  const sendToAssistant = async (params: {
    conversationId: string;
    history: Msg[];
    anchorUserText: string;
  }) => {
    const { conversationId, history, anchorUserText } = params;
    setIsLoading(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      updateConversation(conversationId, (conversation) => {
        const nextMessages: Msg[] = [...conversation.messages];
        const last = nextMessages[nextMessages.length - 1];
        const beforeLast = nextMessages[nextMessages.length - 2];
        if (last?.role === "assistant" && beforeLast?.role === "user" && beforeLast.content === anchorUserText) {
          nextMessages[nextMessages.length - 1] = { role: "assistant", content: assistantSoFar };
        } else {
          nextMessages.push({ role: "assistant", content: assistantSoFar });
        }
        return {
          ...conversation,
          messages: nextMessages,
          title: buildConversationTitle(nextMessages),
        };
      });
    };

    try {
      await streamChat({
        messages: history,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          updateConversation(conversationId, (conversation) => {
            const errorReply: Msg = { role: "assistant", content: `I hit an error while processing your request:\n\n${err}` };
            const nextMessages: Msg[] = [
              ...conversation.messages,
              errorReply,
            ];
            return {
              ...conversation,
              messages: nextMessages,
              title: buildConversationTitle(nextMessages),
            };
          });
          setIsLoading(false);
        },
      });
    } catch {
      setIsLoading(false);
    }
  };

  const generateGoalOutput = async (conversation: ConversationSession, intake: IntakeState, missing: string[] = []) => {
    const introAssistant: Msg = {
      role: "assistant",
      content: missing.length > 0
        ? `Nice, I’ll move forward with smart assumptions for **${intake.goal ? goalLabel(intake.goal) : "this goal"}** and you can refine anything after.`
        : `Awesome — I’ve got enough to generate **${intake.goal ? goalLabel(intake.goal) : "this goal"}**.`,
    };
    const syntheticUser: Msg = {
      role: "user",
      content: buildDeliveryPrompt(intake, missing),
    };
    const history = [...conversation.messages, introAssistant, syntheticUser];
    updateConversation(conversation.id, (current) => ({
      ...current,
      messages: history,
      intake: { ...intake, step: "ready" },
      title: buildConversationTitle(history),
    }));
    await sendToAssistant({
      conversationId: conversation.id,
      history,
      anchorUserText: syntheticUser.content,
    });
  };

  const confirmGoal = async () => {
    if (!activeConversation || isLoading) return;
    const selectedGoal = activeConversation.intake.goal;
    if (!selectedGoal) {
      const infoMsg: Msg = { role: "assistant", content: "Pick a goal from the dropdown and I’ll take it from there ✨" };
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          infoMsg,
        ],
      }));
      return;
    }

    const candidateIntake: IntakeState = {
      ...activeConversation.intake,
      goal: selectedGoal,
      step: "details",
    };
    const missing = assessMissingInfo(candidateIntake);
    if (missing.length > 0) {
      const followUp: Msg = {
        role: "assistant",
        content: `Quick boost before I generate **${goalLabel(selectedGoal)}**:\n\n- ${missing.join("\n- ")}\n\nNo worries if you’re unsure — I’ll continue with assumptions now.`,
      };
      const updatedConversation: ConversationSession = {
        ...activeConversation,
        messages: [...activeConversation.messages, followUp],
        intake: candidateIntake,
        updatedAt: Date.now(),
      };
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        intake: candidateIntake,
        messages: [
          ...conversation.messages,
          followUp,
        ],
      }));
      await generateGoalOutput(updatedConversation, candidateIntake, missing);
      return;
    }

    await generateGoalOutput(activeConversation, candidateIntake);
  };

  const send = async () => {
    if (!activeConversation || isLoading) return;
    const text = input.trim();
    if (!text) return;
    const activeId = activeConversation.id;
    const intake = activeConversation.intake;
    setInput("");

    if (intake.step === "goal") {
      const reminder: Msg = {
        role: "assistant",
        content: "Use the dropdown to choose the goal, then click **Continue** — I’ll handle the rest 🙂",
      };
      updateConversation(activeId, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          reminder,
        ],
      }));
      return;
    }

    const userMsg: Msg = { role: "user", content: text };

    if (intake.step === "projectIdea") {
      updateConversation(activeId, (conversation) => {
        const stepMessage: Msg = {
          role: "assistant",
          content:
            "Great start 🙌 Now pick the goal from the dropdown: **README**, **Architecture**, **UML diagrams**, or **Recommendations**.",
        };
        const nextMessages: Msg[] = [
          ...conversation.messages,
          userMsg,
          stepMessage,
        ];
        return {
          ...conversation,
          messages: nextMessages,
          intake: {
            ...conversation.intake,
            step: "goal",
            projectIdea: text,
          },
          title: buildConversationTitle(nextMessages),
        };
      });
      return;
    }

    if (intake.step === "details") {
      const candidateIntake: IntakeState = {
        ...intake,
        details: [...intake.details, text],
      };
      const missing = assessMissingInfo(candidateIntake);
      if (missing.length > 0) {
        const followUp: Msg = {
          role: "assistant",
          content: `Great, I can already start. Optional extra details:\n\n- ${missing.join("\n- ")}\n\nIf you don’t have them, no problem — I’ll proceed with assumptions.`,
        };
        const updatedConversation: ConversationSession = {
          ...activeConversation,
          messages: [...activeConversation.messages, userMsg, followUp],
          intake: candidateIntake,
          updatedAt: Date.now(),
        };
        updateConversation(activeId, (conversation) => {
          const nextMessages: Msg[] = [
            ...conversation.messages,
            userMsg,
            followUp,
          ];
          return {
            ...conversation,
            messages: nextMessages,
            intake: candidateIntake,
            title: buildConversationTitle(nextMessages),
          };
        });
        await generateGoalOutput(updatedConversation, candidateIntake, missing);
        return;
      }

      const updatedConversation: ConversationSession = {
        ...activeConversation,
        messages: [...activeConversation.messages, userMsg],
        intake: candidateIntake,
        updatedAt: Date.now(),
      };
      updateConversation(activeId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, userMsg],
        intake: candidateIntake,
        title: buildConversationTitle([...conversation.messages, userMsg]),
      }));
      await generateGoalOutput(updatedConversation, candidateIntake);
      return;
    }

    const history = [...activeConversation.messages, userMsg];
    updateConversation(activeId, (conversation) => ({
      ...conversation,
      messages: history,
      title: buildConversationTitle(history),
    }));
    await sendToAssistant({
      conversationId: activeId,
      history,
      anchorUserText: text,
    });
  };

  const startNewChat = () => {
    if (isLoading) return;
    const fresh = createConversation();
    setConversations((prev) => upsertConversations(prev, fresh));
    setActiveConversationId(fresh.id);
    setInput("");
  };

  const updateGoalSelection = (goal: string) => {
    if (!activeConversation) return;
    const normalized = normalizeGoal(goal);
    if (!normalized) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      intake: { ...conversation.intake, goal: normalized },
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const previewImageName = previewImageUrl
    ? previewImageUrl.split("/").pop()?.split("?")[0] || "diagram.png"
    : "diagram.png";

  const inputPlaceholder = activeConversation?.intake.step === "projectIdea"
    ? "Describe your project idea (rough is okay)..."
    : activeConversation?.intake.step === "details"
      ? "Share any extra details you know (I can infer the rest)..."
      : activeConversation?.intake.step === "goal"
        ? "Select a goal below to continue..."
        : "Continue the discussion...";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-foreground">DevAssist AI Agent</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={startNewChat} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-1" /> New Chat
        </Button>
      </div>

      <div className="border-b border-border px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="relative group flex-shrink-0">
              <Button
                variant={conversation.id === activeConversationId ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveConversationId(conversation.id)}
                disabled={isLoading && conversation.id !== activeConversationId}
                className="max-w-[260px] truncate pr-7"
                title={conversation.title}
              >
                {conversation.title}
              </Button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteConversation(conversation.id); }}
                disabled={isLoading}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                title="Delete chat"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {visibleMessages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <Card
              className={`max-w-[75%] px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground"
              }`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert text-inherit">
                <ReactMarkdown
                  components={{
                    img: ({ src, alt }) => {
                      const resolvedSrc = resolveMediaUrl(src);
                      if (!resolvedSrc) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(resolvedSrc)}
                          className="block w-full text-left"
                          title="Open image preview"
                        >
                          <img src={resolvedSrc} alt={alt ?? "Diagram"} className="max-w-full rounded-md border border-border" />
                        </button>
                      );
                    },
                    a: ({ href, children }) => {
                      const resolvedHref = resolveMediaUrl(href) ?? href ?? "#";
                      return (
                        <a href={resolvedHref} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </Card>
            {msg.role === "user" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && visibleMessages[visibleMessages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <Card className="bg-card text-card-foreground px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Card>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="container mx-auto max-w-3xl space-y-3">
          {activeConversation?.intake.step === "goal" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={activeConversation.intake.goal} onValueChange={updateGoalSelection}>
                <SelectTrigger className="sm:flex-1">
                  <SelectValue placeholder="Select discussion goal" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => void confirmGoal()} disabled={!activeConversation.intake.goal || isLoading}>
                Continue
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              className="min-h-[48px] max-h-[160px] resize-none"
              rows={1}
            />
            <Button onClick={() => void send()} disabled={isLoading || !input.trim()} size="icon" className="h-12 w-12 flex-shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-[96vw] w-[1000px] p-4">
          <DialogTitle className="text-sm">Diagram preview</DialogTitle>
          {previewImageUrl && (
            <div className="space-y-3">
              <div className="max-h-[75vh] overflow-auto rounded-md border border-border p-2">
                <img src={previewImageUrl} alt="Diagram preview" className="mx-auto h-auto max-w-full" />
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <a href={previewImageUrl} download={previewImageName}>
                    <Download className="h-4 w-4 mr-1" />
                    Download image
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={previewImageUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in new tab
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentPage;
