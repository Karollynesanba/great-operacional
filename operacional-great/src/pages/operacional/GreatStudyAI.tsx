import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { invokeAiFunction } from '@/integrations/supabase/aiFunctions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { BookOpen, Bot, Loader2, Plus, Send, Sparkles, Trash2, MessageSquare } from 'lucide-react';

interface StudyCategory {
  id: string;
  name: string;
  description: string | null;
}

type StudyAreaValue = 'all' | 'operacional' | string;

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudyConversation {
  id: string;
  title: string;
  mode: 'CATEGORY_FOCUS' | 'GREAT_GENERAL';
  categoryId: StudyAreaValue;
  messages: AIMessage[];
  createdAt: string;
}

const STORAGE_KEY = 'great-study-ai-conversations-v1';
const ACTIVE_KEY = 'great-study-ai-active-conversation-v1';

const QUICK_PROMPTS = [
  'Monte um plano de estudo semanal',
  'Crie um quiz sobre este tema',
  'Resuma esse assunto em tópicos',
  'Explique de forma simples para um iniciante',
];

const DEFAULT_CONVERSATION = (categoryId = 'all'): StudyConversation => ({
  id: crypto.randomUUID(),
  title: 'Nova conversa',
  mode: 'GREAT_GENERAL',
  categoryId,
  messages: [],
  createdAt: new Date().toISOString(),
});

function formatAssistantMessage(content: string) {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return normalized.map((line, index) => {
    const isListItem = /^[-*•]\s+/.test(line);
    const isNumberedItem = /^\d+\.\s+/.test(line);
    const cleanLine = line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');

    return {
      key: `${index}-${cleanLine.slice(0, 20)}`,
      isListItem: isListItem || isNumberedItem,
      html: cleanLine,
    };
  });
}

function readConversations(): StudyConversation[] {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StudyConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readActiveConversationId(): string | null {
  return safeGetItem(ACTIVE_KEY);
}

function getDisplayAreaLabel(categoryId: StudyAreaValue, categories: StudyCategory[]) {
  if (categoryId === 'all') return 'Todas as áreas';
  if (categoryId === 'operacional') return 'Operacional';
  return categories.find((category) => category.id === categoryId)?.name ?? 'Área selecionada';
}

function buildAssistantBlocks(content: string) {
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

function renderRichText(text: string) {
  const parts: Array<string | { bold: string }> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ bold: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((part, index) =>
    typeof part === 'string' ? (
      <span key={index}>{part}</span>
    ) : (
      <strong key={index} className="font-semibold text-slate-950">
        {part.bold}
      </strong>
    ),
  );
}

export default function GreatStudyAI() {
  const [conversations, setConversations] = useState<StudyConversation[]>(() => readConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => readActiveConversationId());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['study-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('study_categories').select('id, name, description').order('name');
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      safeSetItem(ACTIVE_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const selectedMode = activeConversation?.mode ?? 'GREAT_GENERAL';
  const selectedCategoryId = (activeConversation?.categoryId ?? 'all') as StudyAreaValue;
  const activeCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedAreaLabel = getDisplayAreaLabel(selectedCategoryId, categories);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, isLoading]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
      return;
    }

    if (activeConversationId && !conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversations[0]?.id ?? null);
    }
  }, [activeConversationId, conversations]);

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

    const userMessage: AIMessage = { role: 'user', content };

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
      const response = await invokeAiFunction('study-ai-chat', {
        messages: nextHistory,
        mode: conversation?.mode ?? 'GREAT_GENERAL',
        categoryName:
          conversation?.mode === 'CATEGORY_FOCUS'
            ? selectedCategoryId === 'operacional'
              ? 'Operacional'
              : activeCategory
                ? activeCategory.name
                : null
            : null,
        categoryDescription:
          conversation?.mode === 'CATEGORY_FOCUS'
            ? selectedCategoryId === 'operacional'
              ? 'Rotina, CRM, reuniões, execução e priorização de tarefas operacionais.'
              : activeCategory
                ? activeCategory.description
                : null
            : null,
      });

      if (response.error) throw response.error;

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: response.data?.message || 'Não consegui responder agora. Tente de novo em instantes.',
      };

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversationId
            ? { ...item, messages: [...item.messages, assistantMessage] }
            : item,
        ),
      );
    } catch {
      toast.error('Erro ao consultar a Great Study AI.');
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                messages: [...item.messages, { role: 'assistant', content: 'Tive um problema para responder agora. Tente novamente.' }],
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
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_36%),linear-gradient(180deg,#fffefe_0%,#f6f1f0_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.14),_transparent_32%),linear-gradient(180deg,#090b10_0%,#0d1118_100%)]">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card shadow-card dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside data-cy="study-ai-sidebar" className="border-b border-border bg-sidebar-background lg:border-b-0 lg:border-r dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-3 border-b border-border p-4 dark:border-slate-800">
            <Button data-cy="study-ai-new-conversation" className="w-full justify-start gap-2 rounded-2xl bg-red-500 text-white hover:bg-red-600" onClick={createNewConversation}>
              <Plus className="h-4 w-4" />
              Nova conversa
            </Button>
            <p className="text-xs text-muted-foreground dark:text-slate-400">
              As conversas ficam salvas neste navegador.
            </p>
          </div>

          <ScrollArea className="h-[220px] lg:h-[calc(100vh-14rem)]">
            <div className="space-y-1 p-2">
              {conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-2/70 p-4 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                  Comece uma conversa para estudar processos operacionais com a IA.
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left transition-colors',
                      activeConversationId === conversation.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100',
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

        <section className="flex min-w-0 flex-col bg-background dark:bg-slate-950">
          <header className="border-b border-border bg-card/90 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-foreground">Great Study AI</h1>
                <p className="text-sm text-muted-foreground">
                  Assistente focado no setor operacional.
                </p>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/20 bg-primary/10 text-primary">
                Operacional
              </Badge>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col rounded-[32px] border border-white/70 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Button
                    data-cy="study-ai-mode-general"
                    variant={selectedMode === 'GREAT_GENERAL' ? 'default' : 'outline'}
                    className={cn('h-10 rounded-2xl', selectedMode === 'GREAT_GENERAL' ? 'bg-red-500 text-white hover:bg-red-600' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800')}
                    onClick={() => setConversationMode('GREAT_GENERAL')}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Modo geral
                  </Button>
                  <Button
                    data-cy="study-ai-mode-focus"
                    variant={selectedMode === 'CATEGORY_FOCUS' ? 'default' : 'outline'}
                    className={cn('h-10 rounded-2xl', selectedMode === 'CATEGORY_FOCUS' ? 'bg-red-500 text-white hover:bg-red-600' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800')}
                    onClick={() => setConversationMode('CATEGORY_FOCUS')}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Foco por área
                  </Button>
                  <Select value={selectedCategoryId} onValueChange={setConversationCategory}>
                    <SelectTrigger data-cy="study-ai-area-select" className="ml-auto h-10 w-[260px] rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
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
                        className={cn(
                          'max-w-3xl rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm',
                          message.role === 'user'
                            ? 'ml-auto bg-red-500 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="space-y-3">
                            {buildAssistantBlocks(message.content).map((block, blockIndex) => (
                              <p
                                key={`${message.id}-block-${blockIndex}`}
                                className={cn('whitespace-pre-wrap', block.isBullet ? 'pl-4' : '')}
                              >
                                {block.isBullet ? <span className="mr-2 inline-block text-primary">•</span> : null}
                                {renderRichText(block.cleaned)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    ))}
                    {isLoading ? (
                      <div className="flex items-center gap-2 rounded-[24px] bg-slate-100 px-5 py-4 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Pensando...
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-red-50 text-red-500 dark:bg-red-500/10">
                      <Sparkles className="h-9 w-9" />
                    </div>
                    <h2 className="mt-6 text-2xl font-bold text-slate-950 dark:text-slate-50">Comece uma conversa</h2>
                    <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                      Faça perguntas sobre processos, peça resumos, monte exercícios ou use a IA para estudar materiais da Great.
                    </p>

                    <div data-cy="study-ai-quick-prompts" className="mt-6 grid w-full max-w-3xl gap-3 md:grid-cols-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          data-cy="study-ai-quick-prompt"
                          onClick={() => applyPrompt(prompt)}
                          className="rounded-2xl border border-border bg-card px-4 py-4 text-left text-sm text-foreground transition-all hover:border-primary/30 hover:bg-surface-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className="border-t border-slate-100 p-5 dark:border-slate-800">
                <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Pergunte qualquer coisa para a Great Study AI..."
                    className="min-h-[110px] resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Enter envia. Shift + Enter quebra linha.</p>
                    <Button className="h-11 rounded-2xl bg-red-500 px-5 text-white hover:bg-red-600" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-cy="study-ai-help-panel" className="rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
              <h3 className="text-lg font-bold text-slate-950 dark:text-slate-100">Como usar melhor</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Peça formatos específicos</p>
                  <p className="mt-1">Exemplo: resumo, checklist, quiz, passo a passo ou plano semanal.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Use o modo por área</p>
                  <p className="mt-1">Quando quiser respostas mais alinhadas a um tema da biblioteca interna.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Transforme materiais em estudo</p>
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

