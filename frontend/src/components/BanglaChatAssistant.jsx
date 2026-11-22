/**
 * agroWish Frontend - Bangla AI Agricultural Assistant Chat
 * SRS Reference: FR-18 (Bangla Chat), FR-19 (Context-Aware Advice), FR-20 (Knowledge Retrieval),
 *                FR-28 (Graceful Fallback), FR-29 (Source Citation), FR-35 (No Match Safe Guidance)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  BookOpen,
  AlertTriangle,
  Sparkles,
  Bot,
  User
} from 'lucide-react';

const QUICK_PROMPTS = [
  'বোরো ধানে সার প্রয়োগের নিয়ম কী?',
  'আলুর নাবি ধসা রোগের প্রতিকার কী?',
  'পুকুরপাড়ে সবজি ও মাছ চাষ কীভাবে করবো?',
  'গোবর থেকে কেঁচো সার তৈরির পদ্ধতি কী?',
  'ধানের খড় থেকে মাশরুম চাষ কীভাবে করে?'
];

export default function BanglaChatAssistant() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const bottomRef = useRef(null);

  const loadSessions = async () => {
    const token = localStorage.getItem('agrowish_token');
    if (!token) {
      setLoadingSessions(false);
      return;
    }

    try {
      const res = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.sessions || []);
        if (data.sessions && data.sessions.length > 0 && !activeSessionId) {
          selectSession(data.sessions[0].session_id);
        }
      }
    } catch {
      // ignore initial error
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const selectSession = async (sessionId) => {
    const token = localStorage.getItem('agrowish_token');
    setActiveSessionId(sessionId);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.messages || []);
      }
    } catch {
      setErrorMsg('আলোচনা লোড করতে সমস্যা হয়েছে।');
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setErrorMsg('');
  };

  const sendMessage = async (textOverride = null) => {
    const query = (textOverride !== null ? textOverride : inputText).trim();
    if (!query || sending) return;

    const token = localStorage.getItem('agrowish_token');
    if (!token) return;

    setSending(true);
    setErrorMsg('');
    if (textOverride === null) setInputText('');

    const optimisticUserMsg = {
      message_id: `temp-${Date.now()}`,
      sender: 'USER',
      message_text: query
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: query,
          session_id: activeSessionId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'উত্তর পেতে সমস্যা হয়েছে।');
      }

      if (!activeSessionId && data.session_id) {
        setActiveSessionId(data.session_id);
        loadSessions();
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.message_id !== optimisticUserMsg.message_id),
        data.user_message,
        data.assistant_message
      ]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Respect Bangla IME text composition (modern-web-guidance: ime-safe-enter-submit)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Past Chat Sessions */}
      <aside aria-label="পূর্ববর্তী চ্যাট সেশনসমূহ" className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <MessageSquare className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>আলোচনার ইতিহাস</span>
          </div>
          <button
            type="button"
            onClick={handleNewSession}
            className="inline-flex items-center gap-1 px-3 py-1.5 min-h-10 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>নতুন প্রশ্ন</span>
          </button>
        </div>

        {loadingSessions ? (
          <p className="text-xs text-slate-500 py-4 text-center">সেশন লোড হচ্ছে...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">এখনো কোনো আলোচনা শুরু হয়নি।</p>
        ) : (
          <ul className="space-y-1.5 max-h-[340px] overflow-y-auto">
            {sessions.map((s) => (
              <li key={s.session_id}>
                <button
                  type="button"
                  onClick={() => selectSession(s.session_id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    activeSessionId === s.session_id
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                      : 'bg-slate-50/70 border-slate-200/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate">{s.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    {s.message_count || 0} টি বার্তা
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Quick Questions */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>জনপ্রিয় প্রশ্ন (এক ক্লিকে জিজ্ঞাসা করুন):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-left text-[11px] px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <section aria-labelledby="chat-heading" className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-h-[540px] max-h-[680px]">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Bot className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="chat-heading" className="text-base sm:text-lg font-bold text-slate-900">
                বাংলা কৃষি সহায়ক চ্যাট
              </h2>
              <p className="text-xs text-slate-500">
                BRRI, BARI, DAE ও SRDI-এর যাচাইকৃত কৃষি তথ্যভাণ্ডারভিত্তিক নির্ভরযোগ্য উত্তর
              </p>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div
          role="log"
          aria-live="polite"
          aria-label="কৃষি চ্যাট বার্তাসমূহ"
          className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Bot className="w-12 h-12 text-emerald-600/70" aria-hidden="true" />
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                আসসালামু আলাইকুম! আপনার খামার বিষয়ে বাংলায় প্রশ্ন করুন
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                ধান, আলু, গম, ভুট্টা, সরিষা, রোগবালাই দমন, পুকুরপাড়ে সবজি চাষ বা কেঁচো সার তৈরির পদ্ধতি জানতে নিচে লিখুন।
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === 'USER';
            return (
              <div key={msg.message_id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm space-y-2 shadow-2xs ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold ${isUser ? 'text-emerald-100' : 'text-emerald-700'}`}>
                    {isUser ? <User className="w-3.5 h-3.5" aria-hidden="true" /> : <Bot className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{isUser ? 'আপনি' : 'agroWish কৃষি সহায়ক'}</span>
                  </div>

                  <div className="whitespace-pre-line leading-relaxed">
                    {msg.message_text}
                  </div>

                  {/* Citation & Fallback Metadata Badges (FR-28, FR-29, FR-35) */}
                  {!isUser && (msg.source_title || msg.is_fallback) && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.source_title && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span>তথ্যসূত্র: {msg.source_title} ({msg.source_org})</span>
                        </span>
                      )}
                      {msg.is_fallback && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                          <span>
                            {msg.source_title
                              ? 'অফলাইন/যাচাইকৃত তথ্যভাণ্ডার মোড'
                              : 'নিরাপদ বিকল্প বার্তা — কৃষি কর্মকর্তার পরামর্শ নিন'}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>তথ্যভাণ্ডার অনুসন্ধান করা হচ্ছে...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {errorMsg && (
          <div role="alert" className="mx-5 my-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 border-t border-slate-100 flex items-center gap-2 bg-white rounded-b-3xl"
        >
          <label htmlFor="chat-input" className="visually-hidden">
            বাংলায় আপনার কৃষি প্রশ্ন লিখুন
          </label>
          <input
            id="chat-input"
            name="message"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="আপনার কৃষি প্রশ্ন বাংলায় লিখুন (যেমন: আলুর নাবি ধসা রোগের প্রতিকার)..."
            className="flex-1 min-h-12 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="min-h-12 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer text-sm"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">পাঠান</span>
          </button>
        </form>
      </section>
    </div>
  );
}
