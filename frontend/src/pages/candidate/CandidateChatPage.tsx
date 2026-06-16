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
  Paperclip,
  Phone,
  Video,
  Users,
  MessageSquarePlus,
  CircleDashed,
  Play,
  Pause,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import {
  createSession,
  getSession,
  sendTextMessage,
  sendAudioMessage,
  generateProfile,
} from '@/services/api';
import { storage } from '@/utils/storage';
import type { ChatMessage, WhatsAppSession } from '@/types';
import { cn } from '@/utils/cn';

// ─── Tipos locais ────────────────────────────────────────────────────────────
type LocalMessage = ChatMessage & { audioUrl?: string; audioDuration?: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─── Waveform estático ───────────────────────────────────────────────────────
const BARS = 30;
const BAR_HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const v = Math.abs(Math.sin(i * 7.3 + 1.2) * 0.6 + Math.sin(i * 3.1) * 0.4);
  return 0.2 + v * 0.8;
});

// ─── Audio Bubble ────────────────────────────────────────────────────────────
const AudioBubble: React.FC<{ msg: LocalMessage }> = ({ msg }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = msg.audioDuration ?? 0;

  useEffect(() => {
    if (!msg.audioUrl) return;
    const audio = new Audio(msg.audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [msg.audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const displaySecs = playing ? currentTime : duration;
  const filledBars = Math.round(progress * BARS);

  return (
    <div className="flex mb-0.5 justify-end">
      <div className="bg-[#005c4b] rounded-[7.5px] rounded-tr-none px-3 pt-2 pb-2 flex items-center gap-3 min-w-[220px] max-w-[300px]">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {playing ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white translate-x-0.5" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-[2px] h-8">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="rounded-full flex-shrink-0 transition-colors"
                style={{
                  width: 2,
                  height: `${Math.round(h * 100)}%`,
                  backgroundColor:
                    i < filledBars ? '#ffffff' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/70">
              {formatDuration(displaySecs)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#8696a0]">
                {formatTime(msg.timestamp)}
              </span>
              <CheckCheck size={14} className="text-[#53bdeb]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Text Bubble ─────────────────────────────────────────────────────────────
const TextBubble: React.FC<{ msg: LocalMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex mb-0.5', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[65%] rounded-[7.5px] px-[9px] pt-[6px] pb-[8px] text-[14.2px] leading-[19px] break-words',
          isUser
            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none',
        )}
      >
        {msg.content}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[11px] text-[#8696a0]">{formatTime(msg.timestamp)}</span>
          {isUser && <CheckCheck size={14} className="text-[#53bdeb]" />}
        </div>
      </div>
    </div>
  );
};

// ─── Bubble dispatcher ───────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: LocalMessage }> = ({ msg }) => {
  if (msg.audioUrl) return <AudioBubble msg={msg} />;
  return <TextBubble msg={msg} />;
};

// ─── Typing indicator ────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex justify-start mb-1">
    <div className="bg-[#202c33] rounded-[7.5px] rounded-tl-none px-4 py-3 flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-[#8696a0] inline-block animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

// ─── Icon Button ─────────────────────────────────────────────────────────────
const IconBtn: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}> = ({ onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    className="p-2 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#3a4a54] transition-colors flex items-center justify-center"
  >
    {children}
  </button>
);

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ size?: number; fontSize?: number }> = ({
  size = 40,
  fontSize = 14,
}) => (
  <div
    className="rounded-full bg-[#00a884] flex items-center justify-center font-semibold text-[#111] flex-shrink-0"
    style={{ width: size, height: size, fontSize }}
  >
    E+
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const CandidateChatPage: React.FC = () => {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const shouldSendRecordingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // IDs de mensagens user que já existiam ANTES de enviar o áudio.
  // Qualquer msg user nova do backend depois de um envio de áudio é transcrição — deve ser suprimida.
  const knownUserMsgIdsRef = useRef<Set<string>>(new Set());
  // Contador: quantos applySession ainda devem suprimir transcrições do backend.
  // Usamos contador em vez de boolean para aguentar múltiplas chamadas
  // (sendAudio chama applySession uma vez, finalizeProfileIfReady pode chamar mais uma).
  const suppressUserMsgCountRef = useRef(0);

  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const messagesRef = useRef<LocalMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [phone, setPhone] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const applySession = useCallback(
    (s: WhatsAppSession) => {
      setSession(s);
      setMessages((prev) => {
        const audioLocal = prev.filter((m) => m.audioUrl);

        // Decrementa o contador e decide se suprime transcrições nesta chamada
        const shouldSuppress = suppressUserMsgCountRef.current > 0;
        if (shouldSuppress) suppressUserMsgCountRef.current -= 1;

        const backendMsgs: LocalMessage[] = (s.messages || []).filter((m) => {
          if (m.role !== 'user') return true;
          if (!shouldSuppress) return true;
          // Mantém apenas msgs user que já existiam antes do envio do áudio
          return knownUserMsgIdsRef.current.has(m.id);
        });

        const backendIds = new Set(backendMsgs.map((m) => m.id));
        const uniqueAudio = audioLocal.filter((m) => !backendIds.has(m.id));
        return [...uniqueAudio, ...backendMsgs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
      });
      setCurrentStep(s.step || '');
      scrollToBottom();
    },
    [scrollToBottom],
  );

  useEffect(() => {
    const existingId = storage.getSessionId();
    if (existingId) {
      getSession(existingId)
        .then((r) => applySession(r.data))
        .catch(() => {
          storage.clearSessionId();
          setShowPhoneModal(true);
        })
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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    const tempId = Date.now().toString();
    const tempMsg: LocalMessage = {
      id: tempId,
      role: 'user',
      type: 'text',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();

    try {
      const { data } = await sendTextMessage(session.id, {
        step: currentStep,
        text: content,
      });
      applySession(data);
      await finalizeProfileIfReady(session.id, data.step);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      alert('Não foi possível enviar a mensagem. Tente novamente.');
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

  const autoResize = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 120) + 'px';
  };

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const getPreferredAudioMimeType = () => {
    if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  };

  const extensionFromMimeType = (mimeType: string) => {
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  };

  const startRecording = async () => {
    if (!session || loading || recording || recordingStarting) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert('Seu navegador não suporta gravação de áudio.');
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
          alert('Grave um áudio um pouco mais longo antes de enviar.');
          return;
        }

        const audioUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.push(audioUrl);
        const audioDuration = Math.round(durationMs / 1000);
        const audioBubbleId = Date.now().toString() + '_audio';
        const audioTimestamp = new Date().toISOString();

        // Registra IDs de msgs user conhecidas antes do envio
        knownUserMsgIdsRef.current = new Set(
          messagesRef.current.filter((m) => m.role === 'user').map((m) => m.id)
        );
        // +2: sendAudio chama applySession 1x, finalizeProfileIfReady pode chamar mais 1x
        suppressUserMsgCountRef.current = 2;

        const audioMsg: LocalMessage = {
          id: audioBubbleId,
          role: 'user',
          type: 'audio',
          content: '',
          timestamp: audioTimestamp,
          audioUrl,
          audioDuration,
        };
        setMessages((prev) => [...prev, audioMsg]);
        scrollToBottom();

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

  const stopRecording = useCallback(
    (send = true) => {
      shouldSendRecordingRef.current = send;
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else {
        stopMediaStream();
        mediaRecorderRef.current = null;
      }
      setRecording(false);
    },
    [stopMediaStream],
  );

  const toggleRecording = () => {
    if (recording) {
      stopRecording(true);
    } else {
      startRecording();
    }
  };

  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording(false);
      } else {
        stopMediaStream();
      }
    },
    [stopMediaStream, stopRecording],
  );

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
      alert('Não foi possível enviar ou transcrever o áudio. Tente gravar novamente.');
    } finally {
      setLoading(false);
    }
  };

  const lastMsg = messages[messages.length - 1];

  // ─── Phone modal ──────────────────────────────────────────────────────────
  if (showPhoneModal && !initLoading) {
    return (
      <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#202c33] rounded-2xl p-8 shadow-2xl space-y-6 border border-[#2a3942]">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center text-2xl font-bold text-[#111]">
              E+
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#e9edef]">
                emprega<span className="text-[#00a884]">+</span>
              </h2>
              <p className="text-[#8696a0] text-sm mt-1">
                Vamos criar seu perfil profissional por chat.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[#8696a0]">
              Seu número de WhatsApp
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 31999999999"
              type="tel"
              className="w-full rounded-lg border border-[#2a3942] bg-[#2a3942] px-4 py-3 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884]/40 focus:border-[#00a884]"
              onKeyDown={(e) => e.key === 'Enter' && handleStartSession()}
            />
            <button
              onClick={handleStartSession}
              disabled={!phone.trim() || initLoading}
              className="w-full bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 text-[#111] font-semibold rounded-lg py-3 text-sm transition-all"
            >
              {initLoading ? 'Iniciando...' : 'Iniciar conversa'}
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="text-xs text-[#8696a0] hover:text-[#e9edef] transition-colors w-full text-center"
          >
            ← Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (initLoading) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#111b21] overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div className="hidden md:flex w-[360px] min-w-[360px] flex-col bg-[#111b21] border-r border-[#222e35]">
        <div className="flex items-center justify-between px-4 bg-[#202c33] h-[59px] flex-shrink-0">
          <Avatar size={40} />
          <div className="flex items-center">
            <IconBtn title="Comunidades"><Users size={20} /></IconBtn>
            <IconBtn title="Status"><CircleDashed size={20} /></IconBtn>
            <IconBtn title="Nova conversa"><MessageSquarePlus size={20} /></IconBtn>
            <IconBtn title="Menu"><MoreVertical size={20} /></IconBtn>
          </div>
        </div>

        <div className="px-3 py-2 bg-[#111b21]">
          <div className="flex items-center gap-2 bg-[#202c33] rounded-lg px-3 py-2">
            <Search size={16} className="text-[#8696a0] flex-shrink-0" />
            <input
              placeholder="Pesquisar ou começar uma nova conversa"
              className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none flex-1 min-w-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#2a3942] cursor-pointer border-b border-[#222e35]">
            <Avatar size={49} fontSize={16} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[16px] text-[#e9edef]">emprega+</span>
                <span className="text-[12px] text-[#00a884] whitespace-nowrap">
                  {lastMsg ? formatTime(lastMsg.timestamp) : ''}
                </span>
              </div>
              <p className="text-[13px] text-[#8696a0] truncate mt-0.5">
                {lastMsg
                  ? lastMsg.audioUrl
                    ? '🎤 Áudio'
                    : (lastMsg.role === 'user' ? '✓✓ ' : '') +
                      lastMsg.content.slice(0, 40) +
                      (lastMsg.content.length > 40 ? '…' : '')
                  : 'Converse com a IA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: '#0b141a',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0h80v80H0z' fill='%230b141a'/%3E%3Cpath opacity='.03' fill='%23e9edef' d='M20 20h4v4h-4zm16 0h4v4h-4zm16 0h4v4h-4zm-32 16h4v4h-4zm16 0h4v4h-4zm16 0h4v4h-4zm-32 16h4v4h-4zm16 0h4v4h-4zm16 0h4v4h-4z'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 bg-[#202c33] h-[59px] z-10 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="md:hidden text-[#aebac1] hover:text-[#e9edef] p-1 mr-1"
          >
            <ArrowLeft size={20} />
          </button>
          <Avatar size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-medium text-[#e9edef] leading-tight">emprega+</p>
            <p className="text-[13px] text-[#8696a0] leading-tight">
              {loading ? 'digitando...' : 'online'}
            </p>
          </div>
          <div className="flex items-center">
            <IconBtn title="Videochamada"><Video size={20} /></IconBtn>
            <IconBtn title="Chamada"><Phone size={20} /></IconBtn>
            <IconBtn title="Pesquisar"><Search size={20} /></IconBtn>
            <IconBtn title="Menu"><MoreVertical size={20} /></IconBtn>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-[8%] py-3 z-10 flex flex-col gap-0.5">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
              <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center">
                <Avatar size={56} fontSize={18} />
              </div>
              <div>
                <p className="font-medium text-[#e9edef]">Iniciando conversa...</p>
                <p className="text-[#8696a0] text-sm mt-1">
                  A IA vai guiar você na criação do seu currículo.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}

          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-end gap-2 px-4 py-2 bg-[#202c33] z-10 flex-shrink-0 min-h-[62px]">
          <button
            className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#3a4a54] transition-colors flex-shrink-0 mb-1"
            title="Emoji"
          >
            <Smile size={24} />
          </button>
          <button
            className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#3a4a54] transition-colors flex-shrink-0 mb-1"
            title="Anexo"
          >
            <Paperclip size={24} />
          </button>

          <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-[9px] flex items-end my-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              rows={1}
              className="flex-1 bg-transparent text-[15px] text-[#e9edef] placeholder-[#8696a0] focus:outline-none resize-none max-h-[120px] overflow-y-auto leading-[21px] font-[inherit]"
            />
          </div>

          {recording ? (
            <button
              onClick={() => stopRecording(true)}
              disabled={recordingStarting}
              className="w-[52px] h-[52px] rounded-full bg-[#f15c6d] hover:bg-[#e0445a] flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 animate-pulse flex-shrink-0"
              title="Parar gravação"
            >
              <MicOff size={20} className="text-white" />
            </button>
          ) : text.trim() ? (
            <button
              onClick={handleSendText}
              disabled={loading}
              className="w-[52px] h-[52px] rounded-full bg-[#00a884] hover:bg-[#06cf9c] flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 flex-shrink-0"
              title="Enviar"
            >
              <Send size={20} className="text-white translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={toggleRecording}
              disabled={loading || recordingStarting}
              className="w-[52px] h-[52px] rounded-full bg-[#00a884] hover:bg-[#06cf9c] flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 flex-shrink-0"
              title="Gravar áudio"
            >
              <Mic size={20} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};