import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Mic,
  MicOff,
  Search,
  MoreVertical,
  ArrowLeft,
  CheckCheck,
  Smile,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { createSession, getSession, sendTextMessage, sendAudioMessage, generateProfile } from '@/services/api';
import { storage } from '@/utils/storage';
import type { ChatMessage, WhatsAppSession } from '@/types';
import { cn } from '@/utils/cn';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

// ─── Chat Bubble ────────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed',
          isUser
            ? 'bg-[#0D3D85] text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm',
        )}
      >
        {msg.content}
        <span className={cn(
          'ml-3 text-[10px] float-right mt-1',
          isUser ? 'text-white/60' : 'text-gray-400',
        )}>
          {formatTime(msg.timestamp)}
          {isUser && <CheckCheck size={12} className="inline ml-1" />}
        </span>
      </div>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
export const CandidateChatPage: React.FC = () => {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const shouldSendRecordingRef = useRef(false);

  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [phone, setPhone] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('');

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const applySession = useCallback((s: WhatsAppSession) => {
    setSession(s);
    setMessages(s.messages || []);
    setCurrentStep(s.step || '');
    scrollToBottom();
  }, [scrollToBottom]);

  // Init: load or create session
  useEffect(() => {
    const existingId = storage.getSessionId();
    if (existingId) {
      getSession(existingId)
        .then((r) => applySession(r.data))
        .catch(() => { storage.clearSessionId(); setShowPhoneModal(true); })
        .finally(() => setInitLoading(false));
    } else {
      setInitLoading(false);
      setShowPhoneModal(true);
    }
  }, [applySession]);

  const handleStartSession = async () => {
    if (!phone.trim()) return;
    setInitLoading(true);
    try {
      const { data } = await createSession({ phone: phone.trim() });
      storage.setSessionId(data.id);
      applySession(data);
      setShowPhoneModal(false);
    } finally {
      setInitLoading(false);
    }
  };

  const finalizeProfileIfReady = async (sessionId: string, step: string) => {
    if (step !== 'generating_resume') return;

    await generateProfile(sessionId);
    const refreshed = await getSession(sessionId);
    applySession(refreshed.data);
  };

  const handleSendText = async () => {
    if (!text.trim() || !session || loading) return;
    const content = text.trim();
    setText('');
    setLoading(true);

    // Optimistic
    const tempId = Date.now().toString();
    const tempMsg: ChatMessage = {
      id: tempId,
      role: 'user',
      type: 'text',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();

    try {
      const { data } = await sendTextMessage(session.id, { step: currentStep, text: content });
      applySession(data);
      await finalizeProfileIfReady(session.id, data.step);

      // Auto-generate profile when done
      if (false && data.step === 'generating_resume') {
        const profile = await generateProfile(data.id);
        if (profile.data) {
          const doneMsg: ChatMessage = {
            id: Date.now().toString() + '_done',
            role: 'ai',
            type: 'text',
            content: '✅ Seu currículo foi gerado com sucesso! Nossa equipe está buscando vagas compatíveis para você. Assim que encontrarmos um match, você será notificado aqui.',
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, doneMsg]);
          scrollToBottom();
        }
      }
    } catch {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      setText(content);
      alert('Nao foi possivel enviar a mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const getPreferredAudioMimeType = () => {
    if (typeof MediaRecorder.isTypeSupported !== 'function') return '';

    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];

    return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const extensionFromMimeType = (mimeType: string) => {
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  };

  const startRecording = async () => {
    if (!session || loading || recording || recordingStarting) return;

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert('Seu navegador nao suporta gravacao de audio.');
      return;
    }

    setRecordingStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredAudioMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      shouldSendRecordingRef.current = true;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const durationMs = Date.now() - recordingStartedAtRef.current;
        const type = mr.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const shouldSend = shouldSendRecordingRef.current;

        stopMediaStream();
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        recordingStartedAtRef.current = 0;

        if (!shouldSend) return;

        if (durationMs < 900 || blob.size < 1024) {
          alert('Grave um audio um pouco mais longo antes de enviar.');
          return;
        }

        await sendAudio(blob);
      };
      mr.start();
      setRecording(true);
      setRecordingStarting(false);
    } catch {
      stopMediaStream();
      mediaRecorderRef.current = null;
      setRecordingStarting(false);
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = useCallback((send = true) => {
    shouldSendRecordingRef.current = send;

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      stopMediaStream();
      mediaRecorderRef.current = null;
    }

    setRecording(false);
  }, [stopMediaStream]);

  const toggleRecording = () => {
    if (recording) {
      stopRecording(true);
      return;
    }

    startRecording();
  };

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      stopRecording(false);
      return;
    }

    stopMediaStream();
  }, [stopMediaStream, stopRecording]);

  const sendAudio = async (blob: Blob) => {
    if (!session) return;
    setLoading(true);
    const form = new FormData();
    form.append('audio', blob, `audio.${extensionFromMimeType(blob.type)}`);
    form.append('step', currentStep);
    try {
      const { data } = await sendAudioMessage(session.id, form);
      applySession(data);
      await finalizeProfileIfReady(session.id, data.step);
    } catch {
      alert('Nao foi possivel enviar ou transcrever o audio. Tente gravar novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone modal ──────────────────────────────────────────────────────────
  if (showPhoneModal && !initLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary to-primary-600 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Logo size={52} showText={false} />
            <div>
              <h2 className="text-xl font-bold text-primary">Bem-vindo ao emprega<span className="text-accent">+</span></h2>
              <p className="text-gray-500 text-sm mt-1">
                Vamos criar seu perfil profissional por chat.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-primary-700">Seu número de WhatsApp</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 31999999999"
              type="tel"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleStartSession()}
            />
            <button
              onClick={handleStartSession}
              disabled={!phone.trim() || initLoading}
              className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all"
            >
              {initLoading ? 'Iniciando...' : 'Iniciar conversa'}
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-primary transition-colors w-full text-center"
          >
            ← Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (initLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F6F8] overflow-hidden">
      {/* ── Sidebar (WhatsApp Web style) ───────────────────────────────────── */}
      <div className="hidden md:flex w-80 flex-col bg-white border-r border-gray-200">
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0D3D85]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Logo size={22} showText={false} />
            </div>
            <span className="font-bold text-white text-sm">emprega+</span>
          </div>
          <div className="flex gap-2 text-white/70">
            <button className="p-1.5 hover:text-white"><MoreVertical size={18} /></button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-[#F4F6F8] rounded-xl px-3 py-2">
            <Search size={15} className="text-gray-400" />
            <input
              placeholder="Pesquisar"
              className="bg-transparent text-sm text-gray-600 placeholder-gray-400 focus:outline-none flex-1"
            />
          </div>
        </div>

        {/* "Conversation" in sidebar */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0D3D85]/5 border-l-4 border-[#0D3D85] cursor-pointer">
            <div className="w-11 h-11 rounded-full bg-[#0D3D85] flex items-center justify-center flex-shrink-0">
              <Logo size={24} showText={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-primary text-sm">emprega+</p>
                <span className="text-[10px] text-[#7ACB2D] font-medium">
                  {messages.length > 0 ? formatTime(messages[messages.length - 1].timestamp) : ''}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {messages.length > 0 ? messages[messages.length - 1]?.content?.slice(0, 40) + '...' : 'Converse com a IA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0D3D85] shadow-sm">
          <button
            onClick={() => navigate('/')}
            className="md:hidden text-white/80 hover:text-white p-1"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Logo size={20} showText={false} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">emprega+</p>
            <p className="text-xs text-white/60">
              {loading ? 'digitando...' : 'online'}
            </p>
          </div>

          <div className="flex items-center gap-1 text-white/70">
            <button className="p-2 hover:text-white rounded-full hover:bg-white/10"><Search size={18} /></button>
            <button className="p-2 hover:text-white rounded-full hover:bg-white/10"><MoreVertical size={18} /></button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230D3D85' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#F4F6F8',
          }}
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Logo size={36} showText={false} />
              </div>
              <div>
                <p className="font-semibold text-primary">Iniciando conversa...</p>
                <p className="text-gray-400 text-sm mt-1">A IA vai guiar você na criação do seu currículo.</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100">
          <button className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-surface transition-colors">
            <Smile size={22} />
          </button>

          <div className="flex-1 flex items-center bg-[#F4F6F8] rounded-full px-4 py-2 gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none max-h-28 overflow-y-auto"
            />
          </div>

          {text.trim() ? (
            <button
              onClick={handleSendText}
              disabled={loading}
              className="w-11 h-11 rounded-full bg-[#0D3D85] hover:bg-[#0a3070] disabled:opacity-50 flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              <Send size={18} className="text-white translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={toggleRecording}
              disabled={loading || recordingStarting}
              type="button"
              aria-label={recording ? 'Parar gravacao' : 'Gravar audio'}
              title={recording ? 'Parar gravacao' : 'Gravar audio'}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50',
                recording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-[#7ACB2D] hover:bg-[#63A825]',
              )}
            >
              {recording ? (
                <MicOff size={18} className="text-white" />
              ) : (
                <Mic size={18} className="text-white" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
