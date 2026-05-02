import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Download, ExternalLink, Loader2, Plus, Send, Trash2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";

type Msg = { role: "user" | "assistant"; content: string };
type ServiceType = "uml" | "readme" | "architecture" | "recommendation" | "other";
type UMLStep = "diagramTypes" | "system" | "actors" | "extra" | "review" | "done";
type ArchitectureStage = "project" | "services" | "constraints" | "chat";
type RecommendationStage = "problem" | "context" | "constraints" | "chat";

type FlowState = {
  stage: "service" | "uml" | "readme" | "architecture" | "recommendation" | "other";
  service: ServiceType | "";
  uml: {
    step: UMLStep;
    diagramTypes: string[];
    systemDescription: string;
    actorsServices: string;
    extraInfo: string;
  };
  architecture: {
    stage: ArchitectureStage;
    projectSummary: string;
    services: string;
    constraints: string;
  };
  recommendation: {
    stage: RecommendationStage;
    problem: string;
    context: string;
    constraints: string;
  };
};

type ConversationSession = {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
  flow: FlowState;
};

const WELCOME: Msg = {
  role: "assistant",
  content: "Choose a service to start: UML generation, README generation, architecture suggestions, recommendations, or other coding help.",
};

const SERVICE_OPTIONS: Array<{ value: ServiceType; label: string; hint: string }> = [
  { value: "uml", label: "UML generation", hint: "Guided wizard with diagram choices and project details." },
  { value: "readme", label: "README generation", hint: "Use the VS Code extension for repository-aware README output." },
  { value: "architecture", label: "Architecture suggestions", hint: "Discussion flow focused on components, services, and constraints." },
  { value: "recommendation", label: "Recommendations", hint: "Decision support with trade-offs and next actions." },
  { value: "other", label: "Other", hint: "General coding/software engineering discussion." },
];

const UML_DIAGRAM_TYPES = [
  "class",
  "sequence",
  "activity",
  "component",
  "use-case",
  "state",
  "deployment",
  "erd",
];

const MAX_CONVERSATIONS = 20;
const AGENT_BASE_URL =
  ((import.meta.env.VITE_AGENT_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:18000");

const getStorageKey = () => {
  const user = getCurrentUser();
  const userKey = user?.id ?? user?.email ?? "guest";
  return `agent-conversations-v3:${userKey}`;
};

const defaultFlow = (): FlowState => ({
  stage: "service",
  service: "",
  uml: {
    step: "diagramTypes",
    diagramTypes: [],
    systemDescription: "",
    actorsServices: "",
    extraInfo: "",
  },
  architecture: {
    stage: "project",
    projectSummary: "",
    services: "",
    constraints: "",
  },
  recommendation: {
    stage: "problem",
    problem: "",
    context: "",
    constraints: "",
  },
});

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
    flow: defaultFlow(),
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

const removeConversationById = (
  conversations: ConversationSession[],
  conversationId: string,
): ConversationSession[] => conversations.filter((conversation) => conversation.id !== conversationId);

const normalizeFlow = (value: unknown): FlowState => {
  if (!value || typeof value !== "object") return defaultFlow();
  const candidate = value as Partial<FlowState>;
  const base = defaultFlow();
  return {
    ...base,
    ...candidate,
    uml: { ...base.uml, ...(candidate.uml ?? {}) },
    architecture: { ...base.architecture, ...(candidate.architecture ?? {}) },
    recommendation: { ...base.recommendation, ...(candidate.recommendation ?? {}) },
  };
};

const isMsg = (value: unknown): value is Msg => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { role?: unknown; content?: unknown };
  return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
};

const parseStoredConversations = (rawValue: string | null): ConversationSession[] => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Partial<ConversationSession>;
        if (typeof candidate.id !== "string") return null;
        const messages = Array.isArray(candidate.messages) ? candidate.messages.filter(isMsg) : [];
        const title =
          typeof candidate.title === "string" && candidate.title.trim()
            ? candidate.title
            : buildConversationTitle(messages);
        const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now();
        return {
          id: candidate.id,
          title,
          messages,
          updatedAt,
          flow: normalizeFlow(candidate.flow),
        } satisfies ConversationSession;
      })
      .filter((item): item is ConversationSession => Boolean(item))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
};

const getInitialChatState = (): { conversations: ConversationSession[]; activeConversationId: string } => {
  if (typeof window === "undefined") {
    const fresh = createConversation();
    return { conversations: [fresh], activeConversationId: fresh.id };
  }
  const restored = parseStoredConversations(window.localStorage.getItem(getStorageKey()));
  if (restored.length > 0) {
    return { conversations: restored, activeConversationId: restored[0].id };
  }
  const fresh = createConversation();
  return { conversations: [fresh], activeConversationId: fresh.id };
};

const resolveMediaUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${AGENT_BASE_URL}${trimmed}`;
  return `${AGENT_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
};

const buildContextFromMessages = (messages: Msg[], limit = 10): string => {
  const tail = messages.slice(-limit);
  return tail.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n\n");
};

const parseError = async (resp: Response): Promise<string> => {
  const data = await resp.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : `Request failed (${resp.status})`;
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
  const visibleMessages = useMemo(() => [WELCOME, ...(activeConversation?.messages ?? [])], [activeConversation]);

  useEffect(() => {
    if (!conversations.length) return;
    localStorage.setItem(getStorageKey(), JSON.stringify(conversations));
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

  const appendAssistant = (conversationId: string, content: string) => {
    updateConversation(conversationId, (conversation) => {
      const nextMessages = [...conversation.messages, { role: "assistant", content } as Msg];
      return { ...conversation, messages: nextMessages, title: buildConversationTitle(nextMessages) };
    });
  };

  const callAnalyze = async (body: Record<string, unknown>) => {
    const resp = await fetch(`${AGENT_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(await parseError(resp));
    return resp.json();
  };

  const chooseService = (service: ServiceType) => {
    if (!activeConversation || isLoading) return;
    updateConversation(activeConversation.id, (conversation) => {
      const nextFlow = { ...conversation.flow, stage: service, service };
      let assistantText = "";
      if (service === "uml") {
        assistantText = "UML wizard started. First, select one or more diagram types, then continue.";
      } else if (service === "readme") {
        assistantText =
          "For README generation, use the VS Code extension so it can access your project files directly and write the README into your repository.";
      } else if (service === "architecture") {
        assistantText = "Architecture discussion started. Describe your project in a few sentences.";
      } else if (service === "recommendation") {
        assistantText = "Recommendation discussion started. What decision or problem do you want help with?";
      } else {
        assistantText = "Tell me what coding or software engineering help you need.";
      }
      const nextMessages = [...conversation.messages, { role: "assistant", content: assistantText } as Msg];
      return { ...conversation, flow: nextFlow, messages: nextMessages, title: buildConversationTitle(nextMessages) };
    });
  };

  const toggleDiagramType = (diagramType: string) => {
    if (!activeConversation || activeConversation.flow.stage !== "uml") return;
    updateConversation(activeConversation.id, (conversation) => {
      const selected = conversation.flow.uml.diagramTypes.includes(diagramType)
        ? conversation.flow.uml.diagramTypes.filter((item) => item !== diagramType)
        : [...conversation.flow.uml.diagramTypes, diagramType];
      return {
        ...conversation,
        flow: { ...conversation.flow, uml: { ...conversation.flow.uml, diagramTypes: selected } },
      };
    });
  };

  const continueUmlWizard = () => {
    if (!activeConversation || activeConversation.flow.stage !== "uml" || isLoading) return;
    const uml = activeConversation.flow.uml;
    if (uml.step === "diagramTypes") {
      if (uml.diagramTypes.length === 0) {
        appendAssistant(activeConversation.id, "Select at least one diagram type before continuing.");
        return;
      }
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        flow: { ...conversation.flow, uml: { ...conversation.flow.uml, step: "system" } },
        messages: [...conversation.messages, { role: "assistant", content: "Describe the application and its main purpose." }],
      }));
      return;
    }
    if (uml.step === "extra") {
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        flow: { ...conversation.flow, uml: { ...conversation.flow.uml, step: "review" } },
        messages: [...conversation.messages, { role: "assistant", content: "Review your inputs, then click Generate UML." }],
      }));
    }
  };

  const generateUml = async () => {
    if (!activeConversation || activeConversation.flow.stage !== "uml" || isLoading) return;
    const uml = activeConversation.flow.uml;
    if (!uml.systemDescription.trim()) {
      appendAssistant(activeConversation.id, "Missing information: please describe the application first.");
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        flow: { ...conversation.flow, uml: { ...conversation.flow.uml, step: "system" } },
      }));
      return;
    }
    if (!uml.actorsServices.trim()) {
      appendAssistant(activeConversation.id, "Missing information: please describe actors/services and their roles.");
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        flow: { ...conversation.flow, uml: { ...conversation.flow.uml, step: "actors" } },
      }));
      return;
    }

    const payload = {
      type: "uml",
      prompt: "Generate UML diagrams from collected wizard inputs.",
      context: "",
      intake: {
        diagramTypes: uml.diagramTypes,
        systemDescription: uml.systemDescription,
        actorsServices: uml.actorsServices,
        extraInfo: uml.extraInfo,
      },
    };

    setIsLoading(true);
    try {
      const data = await callAnalyze(payload);
      const result = typeof data.result === "string" ? data.result : "No UML output returned.";
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        flow: { ...conversation.flow, uml: { ...conversation.flow.uml, step: "done" } },
        messages: [...conversation.messages, { role: "assistant", content: result }],
      }));
    } catch (err) {
      appendAssistant(activeConversation.id, `UML generation failed:\n\n${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const send = async () => {
    if (!activeConversation || isLoading) return;
    const text = input.trim();
    if (!text) return;
    setInput("");

    const conversationId = activeConversation.id;
    const flow = activeConversation.flow;

    if (flow.stage === "service") {
      appendAssistant(conversationId, "Pick one service card first.");
      return;
    }

    if (flow.stage === "readme") {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          { role: "user", content: text },
          {
            role: "assistant",
            content: "README generation in this page is disabled by design. Open the VS Code extension and request README generation there.",
          },
        ],
      }));
      return;
    }

    if (flow.stage === "uml") {
      const userMsg: Msg = { role: "user", content: text };
      if (flow.uml.step === "system") {
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMsg, { role: "assistant", content: "Now list the actors/services and their key interactions." }],
          flow: { ...conversation.flow, uml: { ...conversation.flow.uml, systemDescription: text, step: "actors" } },
        }));
        return;
      }
      if (flow.uml.step === "actors") {
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMsg, { role: "assistant", content: "Add any further information, or click Continue to skip this optional step." }],
          flow: { ...conversation.flow, uml: { ...conversation.flow.uml, actorsServices: text, step: "extra" } },
        }));
        return;
      }
      if (flow.uml.step === "extra") {
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMsg, { role: "assistant", content: "Thanks. Review and click Generate UML when ready." }],
          flow: { ...conversation.flow, uml: { ...conversation.flow.uml, extraInfo: text, step: "review" } },
        }));
        return;
      }
      if (flow.uml.step === "review" || flow.uml.step === "done") {
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMsg, { role: "assistant", content: "Revision noted. Click Generate UML to produce updated diagrams." }],
          flow: {
            ...conversation.flow,
            uml: { ...conversation.flow.uml, extraInfo: `${conversation.flow.uml.extraInfo}\nRevision: ${text}`.trim(), step: "review" },
          },
        }));
        return;
      }
      appendAssistant(conversationId, "Use the UML wizard controls to continue.");
      return;
    }

    const userMsg: Msg = { role: "user", content: text };
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: [...conversation.messages, userMsg],
    }));

    if (flow.stage === "architecture") {
      if (flow.architecture.stage === "project") {
        if (text.length < 20) {
          appendAssistant(conversationId, "Please provide a bit more detail about your project before we continue.");
          return;
        }
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          flow: {
            ...conversation.flow,
            architecture: { ...conversation.flow.architecture, projectSummary: text, stage: "services" },
          },
          messages: [...conversation.messages, { role: "assistant", content: "List the key services/components and what each does." }],
        }));
        return;
      }
      if (flow.architecture.stage === "services") {
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          flow: {
            ...conversation.flow,
            architecture: { ...conversation.flow.architecture, services: text, stage: "constraints" },
          },
          messages: [...conversation.messages, { role: "assistant", content: "Add constraints or priorities (scale, security, performance, budget, deployment)." }],
        }));
        return;
      }

      setIsLoading(true);
      try {
        const current = conversations.find((item) => item.id === conversationId);
        const conversationContext = buildContextFromMessages([...(current?.messages ?? []), userMsg]);
        const data = await callAnalyze({
          type: "architecture",
          prompt: text,
          context: conversationContext,
          intake: {
            projectSummary: flow.architecture.stage === "constraints" ? flow.architecture.projectSummary : flow.architecture.projectSummary,
            services: flow.architecture.stage === "constraints" ? flow.architecture.services : flow.architecture.services,
            constraints: flow.architecture.stage === "constraints" ? text : flow.architecture.constraints,
          },
        });
        if (data.needs_more_info && typeof data.question === "string") {
          appendAssistant(conversationId, data.question);
        } else {
          const reply = typeof data.result === "string" ? data.result : "No architecture response returned.";
          updateConversation(conversationId, (conversation) => ({
            ...conversation,
            messages: [...conversation.messages, { role: "assistant", content: reply }],
            flow: {
              ...conversation.flow,
              architecture: {
                ...conversation.flow.architecture,
                constraints: flow.architecture.stage === "constraints" ? text : conversation.flow.architecture.constraints,
                stage: "chat",
              },
            },
          }));
        }
      } catch (err) {
        appendAssistant(conversationId, `Architecture request failed:\n\n${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (flow.stage === "recommendation") {
      if (flow.recommendation.stage === "problem") {
        if (text.length < 15) {
          appendAssistant(conversationId, "Please provide more detail about the decision/problem.");
          return;
        }
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          flow: { ...conversation.flow, recommendation: { ...conversation.flow.recommendation, problem: text, stage: "context" } },
          messages: [...conversation.messages, { role: "assistant", content: "Share your project context and what you already tried." }],
        }));
        return;
      }
      if (flow.recommendation.stage === "context") {
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          flow: { ...conversation.flow, recommendation: { ...conversation.flow.recommendation, context: text, stage: "constraints" } },
          messages: [...conversation.messages, { role: "assistant", content: "Add your constraints/trade-offs (time, budget, tooling, team size)." }],
        }));
        return;
      }

      setIsLoading(true);
      try {
        const current = conversations.find((item) => item.id === conversationId);
        const data = await callAnalyze({
          type: "recommendation",
          prompt: text,
          context: buildContextFromMessages([...(current?.messages ?? []), userMsg]),
          intake: {
            problem: flow.recommendation.problem,
            context: flow.recommendation.context,
            constraints: flow.recommendation.stage === "constraints" ? text : flow.recommendation.constraints,
          },
        });
        const reply = typeof data.result === "string" ? data.result : "No recommendation returned.";
        updateConversation(conversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, { role: "assistant", content: reply }],
          flow: {
            ...conversation.flow,
            recommendation: {
              ...conversation.flow.recommendation,
              constraints: flow.recommendation.stage === "constraints" ? text : conversation.flow.recommendation.constraints,
              stage: "chat",
            },
          },
        }));
      } catch (err) {
        appendAssistant(conversationId, `Recommendation request failed:\n\n${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const current = conversations.find((item) => item.id === conversationId);
      const data = await callAnalyze({
        type: "other",
        prompt: text,
        context: buildContextFromMessages([...(current?.messages ?? []), userMsg]),
      });
      const reply = typeof data.result === "string" ? data.result : "No response returned.";
      appendAssistant(conversationId, reply);
    } catch (err) {
      appendAssistant(conversationId, `Request failed:\n\n${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    if (isLoading) return;
    const fresh = createConversation();
    setConversations((prev) => upsertConversations(prev, fresh));
    setActiveConversationId(fresh.id);
    setInput("");
  };

  const deleteConversation = (conversationId: string) => {
    if (isLoading) return;
    const conversation = conversations.find((item) => item.id === conversationId);
    const confirmed = window.confirm(`Delete "${conversation?.title ?? "this discussion"}"? This cannot be undone.`);
    if (!confirmed) return;

    const nextConversations = removeConversationById(conversations, conversationId);
    if (nextConversations.length === 0) {
      const fresh = createConversation();
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
      return;
    }
    setConversations(nextConversations);
    if (activeConversationId === conversationId) setActiveConversationId(nextConversations[0].id);
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

  const flow = activeConversation?.flow;
  const canEnterDiscussionText = flow
    ? flow.stage === "other"
      || flow.stage === "architecture"
      || flow.stage === "recommendation"
      || (flow.stage === "uml" && flow.uml.step !== "diagramTypes")
    : false;
  const inputPlaceholder = !canEnterDiscussionText
    ? undefined
    : flow?.stage === "uml"
      ? flow.uml.step === "system"
        ? "Describe the application..."
        : flow.uml.step === "actors"
          ? "Describe actors/services and interactions..."
          : flow.uml.step === "extra"
            ? "Optional: add further details..."
            : "Add revisions or notes..."
      : "Type your message...";
  const isSendDisabled = isLoading || !input.trim() || !canEnterDiscussionText;
  const isServiceSelectionStep = flow?.stage === "service";
  const isUmlDiagramSelectionStep = flow?.stage === "uml" && flow.uml.step === "diagramTypes";
  const useCenteredSelectionLayout = isServiceSelectionStep || isUmlDiagramSelectionStep;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-foreground">DevAssist AI Agent</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={startNewChat} disabled={isLoading}>
          <Plus className="mr-1 h-4 w-4" /> New Chat
        </Button>
      </div>

      <div className="overflow-x-auto border-b border-border px-4 py-2">
        <div className="flex min-w-max items-center gap-2">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="flex items-center gap-1">
              <Button
                variant={conversation.id === activeConversationId ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveConversationId(conversation.id)}
                disabled={isLoading && conversation.id !== activeConversationId}
                className="max-w-[220px] truncate"
                title={conversation.title}
              >
                {conversation.title}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => deleteConversation(conversation.id)}
                disabled={isLoading}
                title="Delete discussion"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {useCenteredSelectionLayout ? (
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="w-full max-w-5xl space-y-6">
            {isServiceSelectionStep && (
              <div className="mx-auto w-full max-w-4xl space-y-4">
                <div className="text-center text-sm text-muted-foreground">Choose a service to continue.</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SERVICE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => chooseService(option.value)}
                      className="min-h-[120px] rounded-lg border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:bg-accent/20"
                    >
                      <div className="text-base font-semibold text-foreground">{option.label}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{option.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isUmlDiagramSelectionStep && (
              <Card className="mx-auto w-full max-w-4xl space-y-5 border border-border p-6">
                <div className="space-y-1 text-center">
                  <div className="text-base font-semibold">UML wizard</div>
                  <div className="text-sm text-muted-foreground">Select one or more diagram types:</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {UML_DIAGRAM_TYPES.map((diagramType) => {
                    const selected = flow.uml.diagramTypes.includes(diagramType);
                    return (
                      <Button
                        key={diagramType}
                        variant={selected ? "default" : "outline"}
                        size="lg"
                        className="h-14 justify-start px-4 text-sm capitalize"
                        onClick={() => toggleDiagramType(diagramType)}
                      >
                        {diagramType}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex justify-center">
                  <Button onClick={continueUmlWizard} size="lg" disabled={isLoading}>Continue</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <Card className={`max-w-[75%] px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}>
                  <div className="prose prose-sm max-w-none text-inherit dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        img: ({ src, alt }) => {
                          const resolvedSrc = resolveMediaUrl(src);
                          if (!resolvedSrc) return null;
                          return (
                            <button type="button" onClick={() => setPreviewImageUrl(resolvedSrc)} className="block w-full text-left" title="Open image preview">
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
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <Card className="bg-card px-4 py-3 text-card-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Card>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 transition-all duration-200 ease-out">
            <div className="container mx-auto max-w-3xl space-y-3">
              {flow?.stage === "uml" && (
                <Card className="space-y-3 border border-border p-3">
                  <div className="text-sm font-medium">UML wizard</div>
                  {flow.uml.step === "extra" && (
                    <div className="flex gap-2">
                      <Button onClick={continueUmlWizard} variant="outline" disabled={isLoading}>Skip optional step</Button>
                    </div>
                  )}
                  {flow.uml.step === "review" && (
                    <div className="space-y-2">
                      <div className="rounded-md border border-border bg-muted/30 p-2 text-sm">
                        <div><strong>Diagram types:</strong> {flow.uml.diagramTypes.join(", ") || "none"}</div>
                        <div className="mt-1"><strong>App summary:</strong> {flow.uml.systemDescription || "missing"}</div>
                        <div className="mt-1"><strong>Actors/services:</strong> {flow.uml.actorsServices || "missing"}</div>
                        <div className="mt-1"><strong>Further info:</strong> {flow.uml.extraInfo || "none"}</div>
                      </div>
                      <Button onClick={() => void generateUml()} disabled={isLoading}>Generate UML</Button>
                    </div>
                  )}
                </Card>
              )}

              {flow?.stage === "readme" && (
                <Card className="border border-border p-3 text-sm text-muted-foreground">
                  README generation is available in the VS Code extension only. Open the extension panel and request README generation there.
                </Card>
              )}

              {canEnterDiscussionText && (
                <div className="flex gap-2 transition-all duration-200 ease-out">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    className="min-h-[48px] max-h-[160px] resize-none"
                    rows={1}
                  />
                  <Button onClick={() => void send()} disabled={isSendDisabled} size="icon" className="h-12 w-12 flex-shrink-0">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="w-[1000px] max-w-[96vw] p-4">
          <DialogTitle className="text-sm">Diagram preview</DialogTitle>
          {previewImageUrl && (
            <div className="space-y-3">
              <div className="max-h-[75vh] overflow-auto rounded-md border border-border p-2">
                <img src={previewImageUrl} alt="Diagram preview" className="mx-auto h-auto max-w-full" />
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <a href={previewImageUrl} download={previewImageName}>
                    <Download className="mr-1 h-4 w-4" />
                    Download image
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={previewImageUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" />
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
