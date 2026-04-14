import { useEffect, useRef, useState } from 'react';
import aiBot from '../assets/aibot.png';
import { sendAssistantQuery } from '../services/assistantApi';

const STORAGE_KEY = 'requiem-ai-chat-v2';
const MAX_MESSAGES = 50;

const QUICK_PROMPTS = [
  'Summarize scan',
  'Top risks',
  'Vulnerable domains',
  'Threat surface issues',
];

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch {
    // ignore storage failures
  }
}

function renderInline(text) {
  const output = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      output.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      output.push(
        <strong key={`${match.index}-strong`} className="font-extrabold text-on-surface">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      output.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-surface-container-high px-1.5 py-0.5 text-[12px] font-mono text-on-surface"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    output.push(text.slice(lastIndex));
  }

  return output;
}

function RichText({ text }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (!listItems.length) return;
    const ListTag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <ListTag
        key={`list-${blocks.length}`}
        className={`mb-3 space-y-1.5 ${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-5`}
      >
        {listItems}
      </ListTag>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      blocks.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const HeadingTag = `h${Math.min(level + 1, 4)}`;
      blocks.push(
        <HeadingTag
          key={`heading-${index}`}
          className={`mb-2 font-black tracking-tight text-on-surface ${
            level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg'
          }`}
        >
          {renderInline(headingMatch[2])}
        </HeadingTag>
      );
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(
        <li key={`li-${index}`} className="leading-7 text-sm text-on-surface-variant">
          {renderInline(line.replace(/^[-*]\s+/, ''))}
        </li>
      );
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(
        <li key={`ol-${index}`} className="leading-7 text-sm text-on-surface-variant">
          {renderInline(line.replace(/^\d+\.\s+/, ''))}
        </li>
      );
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${index}`} className="mb-3 leading-7 text-sm text-on-surface-variant whitespace-pre-wrap">
        {renderInline(line)}
      </p>
    );
  });

  flushList();
  return <>{blocks}</>;
}

function ChatBubble({ message, onCopy, isCopied }) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.error) || String(message.content || '').startsWith('ERROR:');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <article
        className={`max-w-[92%] sm:max-w-[84%] rounded-2xl border px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-primary text-white border-primary/25 rounded-br-md'
            : isError
              ? 'bg-error-container text-on-error-container border-error/25 rounded-bl-md'
              : 'bg-surface-container-low text-on-surface border-outline-variant/30 rounded-bl-md'
        }`}
      >
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className={`text-[10px] font-black uppercase tracking-[0.24em] ${isUser ? 'text-white/80' : 'text-on-surface-variant'}`}>
            {isUser ? 'You' : 'Assistant'}
          </span>
          {!isUser && (
            <button
              type="button"
              onClick={() => onCopy(message.content)}
              className={`text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${
                isError ? 'text-on-error-container/70 hover:text-on-error-container' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>

        {message.pending ? (
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
            Analyzing...
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/95">{message.content}</p>
        ) : (
          <div className="text-sm leading-7">
            <RichText text={message.content} />
          </div>
        )}

        {!isUser && !message.pending && (message.provider || message.model) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/80">
            {message.provider && (
              <span className="rounded-full border border-outline-variant/30 bg-surface px-2.5 py-1">
                {message.provider}
              </span>
            )}
            {message.model && (
              <span className="rounded-full border border-outline-variant/30 bg-surface px-2.5 py-1 normal-case tracking-normal">
                {message.model}
              </span>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadMessages());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = '40px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [draft]);

  const appendMessages = (updater) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next.slice(-MAX_MESSAGES);
    });
  };

  const sendQuery = async (overrideQuery) => {
    const value = (overrideQuery ?? draft).trim();
    if (!value || sending) return;

    setDraft('');
    setSending(true);
    setCopiedIndex(null);

    const assistantId = makeId();
    appendMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: value },
      { id: assistantId, role: 'assistant', content: '', pending: true },
    ]);

    try {
      const result = await sendAssistantQuery(value);
      appendMessages((prev) => prev.map((message) => {
        if (message.id !== assistantId) return message;
        return {
          ...message,
          content: result.response || 'AI service unavailable',
          pending: false,
          provider: result.provider,
          model: result.model,
          error: String(result.response || '').startsWith('ERROR:'),
        };
      }));
    } catch (error) {
      const errorText = error?.message || 'AI service unavailable';
      appendMessages((prev) => prev.map((message) => {
        if (message.id !== assistantId) return message;
        return {
          ...message,
          content: errorText,
          pending: false,
          provider: 'ollama',
          model: null,
          error: true,
        };
      }));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendQuery();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCopiedIndex(null);
    setDraft('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  };

  const copyMessage = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => {
        setCopiedIndex((current) => (current === index ? null : current));
      }, 1200);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[1100] bg-transparent p-0 border-0 shadow-none transition-transform duration-200 hover:scale-105 focus-visible:outline-none"
          aria-label="Open AI assistant"
        >
          <img
            src={aiBot}
            alt="Open assistant"
            className="block h-[170px] w-auto select-none object-contain drop-shadow-[0_12px_26px_rgba(0,0,0,0.3)] pointer-events-none"
            draggable="false"
          />
        </button>
      )}

      <section
        className={`fixed top-0 right-0 bottom-0 z-[70] flex w-full flex-col border-l border-outline-variant/30 bg-surface text-on-surface shadow-2xl shadow-black/25 transition-transform duration-300 sm:w-[520px] lg:w-[45vw] lg:max-w-[700px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="AI assistant panel"
      >
        <div className="assistant-container flex h-full min-h-0 flex-col bg-gradient-to-b from-surface via-surface to-surface-container-low">
          <div className="flex-none border-b border-outline-variant/20 bg-surface/90 px-5 py-5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <img
                    src={aiBot}
                    alt=""
                    aria-hidden="true"
                    className="h-7 w-7 shrink-0 select-none object-contain"
                    draggable="false"
                  />
                  <h3 className="text-2xl font-black tracking-tight text-on-surface">Requiem AI</h3>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-lg border border-outline-variant/30 bg-surface-container-high px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label="Close assistant"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="messages-area flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center">
                <div className="max-w-md rounded-3xl border border-outline-variant/25 bg-surface-container-low p-5 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[26px]">smart_toy</span>
                  </div>
                  <h4 className="text-lg font-black text-on-surface">Start a conversation</h4>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    Ask for a scan summary, threat surface review, or a plain-English explanation of what changed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <ChatBubble
                    key={message.id || `${message.role}-${index}`}
                    message={message}
                    onCopy={(content) => copyMessage(content, index)}
                    isCopied={copiedIndex === index}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="suggestions flex-none border-t border-outline-variant/20 bg-surface/95 px-4 py-2 backdrop-blur-md sm:px-5">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuery(prompt)}
                  disabled={sending}
                  className="suggestion-chip whitespace-nowrap rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1 text-[13px] font-medium leading-none text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="input-area sticky bottom-0 z-10 border-t border-outline-variant/20 bg-surface/98 px-3 py-2 backdrop-blur-md sm:px-4">
            <div className="rounded-2xl border border-outline-variant/25 bg-white p-1.5 shadow-sm">
              <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about the latest scan context..."
                className="max-h-[120px] min-h-[40px] flex-1 resize-none overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface px-3 py-2.5 text-[14px] leading-[1.4] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary/30"
                style={{ height: '40px' }}
              />

                <button
                  type="button"
                  onClick={() => sendQuery()}
                  disabled={!draft.trim() || sending}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
