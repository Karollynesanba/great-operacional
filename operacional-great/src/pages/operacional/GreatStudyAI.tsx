import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeAiFunction } from '@/integrations/supabase/aiFunctions';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, MessageSquare, Plus, Send, Sparkles, Trash2, BookOpen } from 'lucide-react';

interface StudyCategory {
  id: string;
  name: string;
  description: string | null;
}

type StudyAreaValue = 'all' | 'operacional' | string;
type AIMessageRole = 'user' | 'assistant';

interface AIMessage {
  role: AIMessageRole;
  content: string;
  createdAt: string;
}

interface StudyConversation {
  id: string;
  title: string;
  mode: 'CATEGORY_FOCUS' | 'GREAT_GENERAL';
  categoryId: StudyAreaValue;
  messages: AIMessage[];
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'great-study-ai-conversations-v1';
const ACTIVE_KEY_PREFIX = 'great-study-ai-active-conversation-v1';
const SYNC_DEBOUNCE_MS = 400;

const QUICK_PROMPTS = [
  'Monte um checklist',
  'Monte um plano de estudo semanal',
  'Crie um quiz sobre este tema',
  'Resuma esse assunto em tópicos',
  'Explique de forma simples para um iniciante',
];

const DEFAULT_CONVERSATION = (categoryId: StudyAreaValue = 'all'): StudyConversation => ({
  id: crypto.randomUUID(),
  title: 'Nova conversa',
  mode: 'GREAT_GENERAL',
  categoryId,
  messages: [],
  createdAt: new Date().toISOString(),
});

function getConversationsStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function getActiveConversationStorageKey(userId: string) {
  return `${ACTIVE_KEY_PREFIX}:${userId}`;
}

function normalizeConversation(conversation: StudyConversation): StudyConversation {
  return {
    ...conversation,
    createdAt: conversation.createdAt || new Date().toISOString(),
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt || conversation.createdAt || new Date().toISOString(),
        }))
      : [],
  };
}

function readConversations(userId: string) {
  const raw = safeGetItem(getConversationsStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StudyConversation[];
    return Array.isArray(parsed) ? parsed.map(normalizeConversation) : [];
  } catch {
    return [];
  }
}

function readActiveConversationId(userId: string) {
  return safeGetItem(getActiveConversationStorageKey(userId));
}

function persistStudyState(userId: string, conversations: StudyConversation[], activeConversationId: string | null) {
  safeSetItem(getConversationsStorageKey(userId), JSON.stringify(conversations));

  if (activeConversationId) {
    safeSetItem(getActiveConversationStorageKey(userId), activeConversationId);
    return;
  }

  try {
    window.localStorage.removeItem(getActiveConversationStorageKey(userId));
  } catch {
    // Ignore storage failures.
  }
}

function toDbMessageRole(role: AIMessageRole): 'USER' | 'ASSISTANT' {
  return role === 'user' ? 'USER' : 'ASSISTANT';
}

function fromDbMessageRole(role: string): AIMessageRole {
  return role === 'ASSISTANT' ? 'assistant' : 'user';
}

function fromDbMode(mode: string | null): 'CATEGORY_FOCUS' | 'GREAT_GENERAL' {
  return mode === 'CATEGORY_FOCUS' ? 'CATEGORY_FOCUS' : 'GREAT_GENERAL';
}

function toDbCategoryId(categoryId: StudyAreaValue) {
  return categoryId === 'all' ? null : categoryId;
}

function fromDbCategoryId(categoryId: string | null) {
  return (categoryId ?? 'all') as StudyAreaValue;
}

function buildConversationFromDb(
  conversation: {
    id: string;
    title: string | null;
    context_mode: 'CATEGORY_FOCUS' | 'GREAT_GENERAL';
    category_id: string | null;
    created_at: string;
  },
  messages: Array<{
    content: string;
    role: string;
    created_at: string;
  }>,
): StudyConversation {
  return {
    id: conversation.id,
    title: conversation.title || 'Nova conversa',
    mode: fromDbMode(conversation.context_mode),
    categoryId: fromDbCategoryId(conversation.category_id),
    createdAt: conversation.created_at,
    messages: messages.map((message) => ({
      role: fromDbMessageRole(message.role),
      content: message.content,
      createdAt: message.created_at,
    })),
  };
}

async function syncStudyConversations(userId: string, conversations: StudyConversation[]) {
  const { data: existingConversations, error: existingError } = await supabase
    .from('study_ai_conversations')
    .select('id')
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const existingIds = (existingConversations ?? []).map((conversation) => conversation.id);
  const nextIds = conversations.map((conversation) => conversation.id);
  const removedIds = existingIds.filter((id) => !nextIds.includes(id));

  if (removedIds.length > 0) {
    const { error: removeMessagesError } = await supabase
      .from('study_ai_messages')
      .delete()
      .in('conversation_id', removedIds);
    if (removeMessagesError) throw removeMessagesError;

    const { error: removeConversationsError } = await supabase
      .from('study_ai_conversations')
      .delete()
      .eq('user_id', userId)
      .in('id', removedIds);
    if (removeConversationsError) throw removeConversationsError;
  }

  for (const conversation of conversations) {
    const { error: conversationError } = await supabase.from('study_ai_conversations').upsert(
      {
        id: conversation.id,
        user_id: userId,
        title: conversation.title,
        context_mode: conversation.mode,
        category_id: toDbCategoryId(conversation.categoryId),
      },
      { onConflict: 'id' },
    );

    if (conversationError) throw conversationError;

    const { error: clearMessagesError } = await supabase
      .from('study_ai_messages')
      .delete()
      .eq('conversation_id', conversation.id);
    if (clearMessagesError) throw clearMessagesError;

    if (conversation.messages.length === 0) continue;

    const messageRows = conversation.messages.map((message) => ({
      conversation_id: conversation.id,
      role: toDbMessageRole(message.role),
      content: message.content,
      created_at: message.createdAt,
    }));

    const { error: messagesError } = await supabase.from('study_ai_messages').insert(messageRows);
    if (messagesError) throw messagesError;
  }
}

function getDisplayAreaLabel(categoryId: StudyAreaValue, categories: StudyCategory[]) {
  if (categoryId === 'all') return 'Todas as áreas';
  if (categoryId === 'operacional') return 'Operacional';
  return categories.find((category) => category.id === categoryId)?.name ?? 'Área selecionada';
}

function parseAssistantBlocks(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isBullet = /^[-*•]\s+/.test(line);
      const isNumbered = /^\d+\.\s+/.test(line);
      const cleaned = line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
      return { isBullet: isBullet || isNumbered, cleaned };
    });
}

function renderBoldText(text: string) {
  const pieces: Array<string | { bold: string }> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pieces.push(text.slice(lastIndex, match.index));
    }
    pieces.push({ bold: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    pieces.push(text.slice(lastIndex));
  }

  return pieces.map((piece, index) =>
    typeof piece === 'string' ? (
      <span key={index}>{piece}</span>
    ) : (
      <strong key={index} className="font-semibold text-foreground">
        {piece.bold}
      </strong>
    ),
  );
}

function buildStudyFallbackMessage(
  prompt: string,
  mode: 'CATEGORY_FOCUS' | 'GREAT_GENERAL',
  categoryLabel: string,
) {
  const trimmedPrompt = prompt.trim();

  if (mode === 'CATEGORY_FOCUS') {
    return `Resposta local sobre ${categoryLabel}: recebi "${trimmedPrompt.slice(0, 160)}". Posso montar resumo, checklist, quiz ou passo a passo a partir desse tema.`;
  }

  return `Resposta local da Great Study AI: recebi "${trimmedPrompt.slice(0, 160)}". Posso resumir, explicar, organizar em tópicos ou criar um exercício prático.`;
}

export default function GreatStudyAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<StudyConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['study-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('study_categories').select('id, name, description').order('name');
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadUserStudyData = async () => {
      if (!user?.id) {
        setConversations([]);
        setActiveConversationId(null);
        setIsHydrated(true);
        return;
      }

      setIsHydrated(false);

      const localConversations = readConversations(user.id);
      const localActiveConversationId = readActiveConversationId(user.id);
      setConversations(localConversations);
      setActiveConversationId(localActiveConversationId);

      try {
        const { data: conversationRows, error: conversationError } = await supabase
          .from('study_ai_conversations')
          .select('id, title, context_mode, category_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (conversationError) throw conversationError;

        const rows = conversationRows ?? [];

        if (rows.length === 0) {
          if (!cancelled) {
            setConversations(localConversations);
            setActiveConversationId(
              localConversations.some((conversation) => conversation.id === localActiveConversationId)
                ? localActiveConversationId
                : localConversations[0]?.id ?? null,
            );
          }
          return;
        }

        const conversationIds = rows.map((conversation) => conversation.id);
        const { data: messageRows, error: messageError } = conversationIds.length
          ? await supabase
              .from('study_ai_messages')
              .select('conversation_id, content, role, created_at')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: true })
          : { data: [], error: null };

        if (messageError) throw messageError;

        const messagesByConversationId = new Map<string, Array<{ content: string; role: string; created_at: string }>>();
        (messageRows ?? []).forEach((message) => {
          const currentMessages = messagesByConversationId.get(message.conversation_id) ?? [];
          currentMessages.push(message);
          messagesByConversationId.set(message.conversation_id, currentMessages);
        });

        const nextConversations = rows.map((conversation) =>
          buildConversationFromDb(conversation, messagesByConversationId.get(conversation.id) ?? []),
        );

        if (!cancelled) {
          setConversations(nextConversations);
          setActiveConversationId(
            nextConversations.some((conversation) => conversation.id === localActiveConversationId)
              ? localActiveConversationId
              : nextConversations[0]?.id ?? null,
          );
        }

        persistStudyState(
          user.id,
          nextConversations,
          nextConversations.some((conversation) => conversation.id === localActiveConversationId)
            ? localActiveConversationId
            : nextConversations[0]?.id ?? null,
        );
      } catch {
        if (!cancelled) {
          setConversations(localConversations);
          setActiveConversationId(
            localConversations.some((conversation) => conversation.id === localActiveConversationId)
              ? localActiveConversationId
              : localConversations[0]?.id ?? null,
          );
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };

    void loadUserStudyData();

    return () => {
      cancelled = true;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isHydrated) return;

    persistStudyState(user.id, conversations, activeConversationId);

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      void syncStudyConversations(user.id, conversations).catch((error) => {
        console.error('Erro ao sincronizar conversas da Great Study AI:', error);
      });
    }, SYNC_DEBOUNCE_MS);
  }, [conversations, activeConversationId, isHydrated, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, activeConversationId, isLoading]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const selectedMode = activeConversation?.mode ?? 'GREAT_GENERAL';
  const selectedCategoryId = (activeConversation?.categoryId ?? 'all') as StudyAreaValue;
  const activeCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedAreaLabel = getDisplayAreaLabel(selectedCategoryId, categories);

  const upsertConversation = (conversationId: string, updater: (conversation: StudyConversation) => StudyConversation) => {
    setConversations((prev) => prev.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const createNewConversation = () => {
    const conversation = DEFAULT_CONVERSATION(selectedCategoryId);
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    setInput('');
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
  };

  const setConversationMode = (mode: 'CATEGORY_FOCUS' | 'GREAT_GENERAL') => {
    if (!activeConversationId) {
      const conversation = DEFAULT_CONVERSATION(selectedCategoryId);
      conversation.mode = mode;
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      return;
    }

    upsertConversation(activeConversationId, (conversation) => ({ ...conversation, mode }));
  };

  const setConversationCategory = (categoryId: string) => {
    if (!activeConversationId) {
      const conversation = DEFAULT_CONVERSATION(categoryId);
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      return;
    }

    upsertConversation(activeConversationId, (conversation) => ({ ...conversation, categoryId }));
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    let conversationId = activeConversationId;
    let conversation = activeConversation;

    if (!conversationId || !conversation) {
      conversation = DEFAULT_CONVERSATION(selectedCategoryId);
      conversationId = conversation.id;
      setConversations((prev) => [conversation!, ...prev]);
      setActiveConversationId(conversationId);
    }

    const userMessage: AIMessage = {
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((item) => {
        if (item.id !== conversationId) return item;
        const nextTitle = item.messages.length === 0 ? content.slice(0, 42) : item.title;
        return { ...item, title: nextTitle, messages: [...item.messages, userMessage] };
      }),
    );

    setInput('');
    setIsLoading(true);

    try {
      const nextHistory = [...(conversation?.messages ?? []), userMessage];
      const mode = conversation?.mode ?? 'GREAT_GENERAL';
      const categoryLabel =
        mode === 'CATEGORY_FOCUS'
          ? selectedCategoryId === 'operacional'
            ? 'Operacional'
            : activeCategory
              ? activeCategory.name
              : 'Área selecionada'
          : 'Great Study';

      const response = await invokeAiFunction('study-ai-chat', {
        messages: nextHistory,
        mode,
        categoryName:
          mode === 'CATEGORY_FOCUS'
            ? selectedCategoryId === 'operacional'
              ? 'Operacional'
              : activeCategory
                ? activeCategory.name
                : null
            : null,
        categoryDescription:
          mode === 'CATEGORY_FOCUS'
            ? selectedCategoryId === 'operacional'
              ? 'Rotina, CRM, reuniões, execução e priorização de tarefas operacionais.'
              : activeCategory
                ? activeCategory.description
                : null
            : null,
      });

      if (response.error) {
        throw response.error;
      }

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: response.data?.message || 'Não consegui responder agora. Tente de novo em instantes.',
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((item) => (item.id === conversationId ? { ...item, messages: [...item.messages, assistantMessage] } : item)),
      );
    } catch {
      const mode = conversation?.mode ?? 'GREAT_GENERAL';
      const categoryLabel =
        mode === 'CATEGORY_FOCUS'
          ? selectedCategoryId === 'operacional'
            ? 'Operacional'
            : activeCategory
              ? activeCategory.name
              : 'Área selecionada'
          : 'Great Study';
      const fallbackMessage = buildStudyFallbackMessage(content, mode, categoryLabel);

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                messages: [
                  ...item.messages,
                  { role: 'assistant', content: fallbackMessage, createdAt: new Date().toISOString() },
                ],
              }
            : item,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const applyPrompt = (prompt: string) => setInput(prompt);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card shadow-card lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside data-cy="study-ai-sidebar" className="border-b border-border bg-muted/20 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <Button data-cy="study-ai-new-conversation" className="w-full justify-start gap-2 rounded-2xl bg-red-500 text-white hover:bg-red-600" onClick={createNewConversation}>
              <Plus className="h-4 w-4" />
              Nova conversa
            </Button>
            <p className="text-xs text-muted-foreground">As conversas ficam salvas no perfil de cada usuário.</p>
          </div>

          <ScrollArea className="h-[220px] lg:h-[calc(100vh-14rem)]">
            <div className="space-y-1 p-2">
              {conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Comece uma conversa para estudar processos operacionais com a IA.
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    data-cy="study-ai-conversation-item"
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left transition-colors',
                      activeConversationId === conversation.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{conversation.title}</span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-w-0 flex-col bg-background">
          <header className="border-b border-border bg-card/90 px-6 py-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-foreground">Great Study AI</h1>
                <p className="text-sm text-muted-foreground">Assistente focado no setor operacional.</p>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/20 bg-primary/10 text-primary">
                Operacional
              </Badge>
              <Button
                variant="outline"
                className="ml-2 h-10 rounded-2xl border-border/60 bg-background text-foreground hover:bg-accent"
                onClick={() => navigate('/operacional/area-estudo/conteudos')}
              >
                Voltar para conteúdos
              </Button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col rounded-[32px] border border-border/70 bg-card shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="border-b border-border px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    data-cy="study-ai-mode-general"
                    variant={selectedMode === 'GREAT_GENERAL' ? 'default' : 'outline'}
                    className={cn(
                      'h-10 rounded-2xl',
                      selectedMode === 'GREAT_GENERAL'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'border-border bg-background text-foreground hover:bg-accent',
                    )}
                    onClick={() => setConversationMode('GREAT_GENERAL')}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Modo geral
                  </Button>
                  <Button
                    data-cy="study-ai-mode-focus"
                    variant={selectedMode === 'CATEGORY_FOCUS' ? 'default' : 'outline'}
                    className={cn(
                      'h-10 rounded-2xl',
                      selectedMode === 'CATEGORY_FOCUS'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'border-border bg-background text-foreground hover:bg-accent',
                    )}
                    onClick={() => setConversationMode('CATEGORY_FOCUS')}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Foco por área
                  </Button>
                  <Select value={selectedCategoryId} onValueChange={setConversationCategory}>
                    <SelectTrigger data-cy="study-ai-area-select" className="ml-auto h-10 w-[260px] rounded-2xl border-border bg-background text-foreground">
                      <SelectValue placeholder="Selecione uma área">{selectedAreaLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as áreas</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 py-6" ref={scrollRef}>
                {activeConversation?.messages.length ? (
                  <div className="space-y-4">
                    {activeConversation.messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        data-cy={message.role === 'assistant' ? 'study-ai-assistant-message' : 'study-ai-user-message'}
                        className={cn('max-w-3xl rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm', message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground')}
                      >
                        {message.role === 'assistant' ? (
                          <div className="space-y-3">
                            {parseAssistantBlocks(message.content).map((block, blockIndex) => (
                              <p key={`${index}-${blockIndex}`} className={cn('whitespace-pre-wrap', block.isBullet ? 'pl-4' : '')}>
                                {block.isBullet ? <span className="mr-2 inline-block text-primary">•</span> : null}
                                {renderBoldText(block.cleaned)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    ))}
                    {isLoading ? (
                      <div className="flex items-center gap-2 rounded-[24px] bg-muted/60 px-5 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Pensando...
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-red-50 text-red-500">
                      <Sparkles className="h-9 w-9" />
                    </div>
                    <h2 className="mt-6 text-2xl font-bold text-foreground">Comece uma conversa</h2>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                      Faça perguntas sobre processos, peça resumos, monte exercícios ou use a IA para estudar materiais da Great.
                    </p>

                    <div data-cy="study-ai-quick-prompts" className="mt-6 grid w-full max-w-3xl gap-3 md:grid-cols-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          data-cy="study-ai-quick-prompt"
                          onClick={() => applyPrompt(prompt)}
                          className="rounded-2xl border border-border bg-card px-4 py-4 text-left text-sm text-foreground transition-all hover:border-primary/30 hover:bg-accent/60"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className="border-t border-border p-5">
                <div className="rounded-[28px] border border-border bg-background p-3 shadow-sm">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Pergunte qualquer coisa para a Great Study AI..."
                    className="min-h-[110px] resize-none border-0 bg-transparent p-2 text-base text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Enter envia. Shift + Enter quebra linha.</p>
                    <Button className="h-11 rounded-2xl bg-red-500 px-5 text-white hover:bg-red-600" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-cy="study-ai-help-panel" className="rounded-[32px] border border-border/70 bg-card p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-bold text-foreground">Como usar melhor</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">Peça formatos específicos</p>
                  <p className="mt-1">Exemplo: resumo, checklist, quiz, passo a passo ou plano semanal.</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">Use o modo por área</p>
                  <p className="mt-1">Quando quiser respostas mais alinhadas a um tema da biblioteca interna.</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">Transforme materiais em estudo</p>
                  <p className="mt-1">A IA pode explicar, testar retenção e sugerir aplicação prática no dia a dia.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
