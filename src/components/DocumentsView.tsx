import React, { useState, useEffect, useRef } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { 
  Upload, Link as LinkIcon, Image as ImageIcon, Mic, MicOff, Play, Pause, FileText, 
  ExternalLink, User, Download, AlertCircle, FileAudio
} from 'lucide-react';

interface DocumentData {
  docId: string;
  title: string;
  category: string;
  description?: string;
  type: 'link' | 'image' | 'voice' | 'file';
  content: string; // URL, Base64 representation, etc.
  submittedBy: string;
  submittedAt: string;
}

export const DocumentsView: React.FC = () => {
  const user = useKanbanStore((s) => s.user);
  const theme = useKanbanStore((s) => s.theme);
  const roomCode = user?.roomCode || '';

  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [docType, setDocType] = useState<'link' | 'image' | 'voice' | 'file'>('file');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Design');
  const [description, setDescription] = useState('');
  
  // Input contents
  const [linkUrl, setLinkUrl] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/collaboration/documents?roomCode=${roomCode}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  useEffect(() => {
    if (roomCode) {
      fetchDocuments();
    }
  }, [roomCode]);

  // Connect WebSockets
  useEffect(() => {
    if (!roomCode) return;
    const wsHost = window.location.port ? `${window.location.hostname}:5000` : window.location.host;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${wsHost}`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomCode,
        user: { fullName: user?.fullName, email: user?.email }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'document_update') {
          fetchDocuments();
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      socket.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomCode]);

  // Handle files (Image or general File)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!title) {
      // Auto-set title from file name (sans extension)
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Convert Blob to base64 Data URL for upload
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setFileBase64(reader.result);
          }
        };
        reader.readAsDataURL(blob);
        
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start voice recording:', err);
      alert('Could not access microphone.');
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Submit Document Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let content = '';
    if (docType === 'link') {
      if (!linkUrl.trim()) return;
      content = linkUrl;
    } else {
      if (!fileBase64) {
        alert('Please upload a file or record audio first.');
        return;
      }
      content = fileBase64;
    }

    const docId = 'doc_' + Math.random().toString(36).substring(2, 9);
    const docPayload = {
      docId,
      title,
      category,
      description,
      type: docType,
      content,
      submittedBy: user?.fullName || 'Anonymous',
      roomCode
    };

    try {
      const res = await fetch('/api/collaboration/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPayload)
      });

      if (res.ok) {
        // Reset states
        setTitle('');
        setDescription('');
        setLinkUrl('');
        setFileBase64('');
        setFileName('');
        setAudioBlob(null);
        setAudioUrl(null);
        
        // Notify others
        wsRef.current?.send(JSON.stringify({ type: 'document_update', roomCode }));
        fetchDocuments();
      }
    } catch (err) {
      console.error('Failed to submit document:', err);
    }
  };

  // Audio Playback handler for submitted voices
  const playVoice = (id: string, base64Audio: string) => {
    if (playingAudioId === id) {
      audioPlaybackRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      const audio = new Audio(base64Audio);
      audioPlaybackRef.current = audio;
      setPlayingAudioId(id);
      audio.play();
      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* LEFT COLUMN: Submit Document Form */}
      <div className={`flex-1 flex flex-col rounded-3xl border p-6 ${
        theme === 'dark' 
          ? 'bg-slate-900/40 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      } overflow-y-auto custom-scrollbar shadow-2xl backdrop-blur-xl`}>
        
        <div className="mb-6">
          <h2 className="font-bold text-xl leading-tight">Submit Document</h2>
          <p className="text-xs text-slate-500 mt-1">Upload project assets, links, images, or voice notes to the workspace.</p>
        </div>

        {/* Document Type Selector Tabs */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6">
          {(['file', 'link', 'image', 'voice'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setDocType(type);
                setFileBase64('');
                setFileName('');
                setAudioUrl(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                docType === type
                  ? 'bg-white dark:bg-slate-900 text-indigo-500 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {type === 'file' && <FileText className="w-3.5 h-3.5" />}
              {type === 'link' && <LinkIcon className="w-3.5 h-3.5" />}
              {type === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
              {type === 'voice' && <Mic className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{type}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
          
          {/* DYNAMIC COMPONENT INPUT BASED ON TYPE */}
          {docType === 'link' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Web Link (URL)</label>
              <div className="relative mt-2">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://example.com/project-brief"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm border focus:outline-none focus:border-indigo-500 transition-all ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-55 border-slate-200'
                  }`}
                />
              </div>
            </div>
          )}

          {docType === 'image' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upload Image</label>
              <div className={`mt-2 border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                theme === 'dark' ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                {fileBase64 ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={fileBase64} alt="Preview" className="max-h-40 rounded-xl object-contain shadow-md" />
                    <span className="text-xs text-slate-400 truncate max-w-[200px]">{fileName}</span>
                    <button
                      type="button"
                      onClick={() => setFileBase64('')}
                      className="text-xs text-rose-500 font-bold hover:underline"
                    >
                      Remove & Choose Another
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-indigo-500 opacity-60" />
                    <span className="text-xs font-semibold text-slate-400">Click to upload PNG, JPG, or SVG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {docType === 'file' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upload File</label>
              <div className={`mt-2 border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                theme === 'dark' ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                {fileBase64 ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-400 truncate max-w-[220px]">{fileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFileBase64('');
                        setFileName('');
                      }}
                      className="text-xs text-rose-500 font-bold hover:underline mt-1"
                    >
                      Choose Another File
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-indigo-500 opacity-60" />
                    <span className="text-xs font-semibold text-slate-400">Click to upload document (PDF, DOCX, ZIP, etc)</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.zip,.xlsx,.csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {docType === 'voice' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Voice Memo Recorder</label>
              <div className={`mt-2 border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                theme === 'dark' ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex flex-col items-center gap-4">
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-rose-600 animate-pulse flex items-center justify-center text-white">
                        <MicOff className="w-5 h-5 animate-bounce" />
                      </div>
                      <span className="text-sm font-mono font-bold text-rose-500">
                        Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Stop Recording
                      </button>
                    </div>
                  ) : audioUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold text-slate-400">Voice Note Recorded Successfully!</span>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const audio = new Audio(audioUrl);
                            audio.play();
                          }}
                          className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" /> Play Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudioUrl(null);
                            setFileBase64('');
                          }}
                          className="text-xs text-rose-500 font-bold hover:underline"
                        >
                          Record Again
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer transition-transform hover:scale-105"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <span className="text-xs font-semibold text-slate-400">Click to start recording voice note</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Document Title</label>
              <input
                type="text"
                placeholder="e.g. Q3 Design Deck"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full mt-2 px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition-all ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full mt-2 px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition-all cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-850 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Development">Development</option>
                <option value="Research">Research</option>
                <option value="Legal">Legal/Contracts</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Briefly explain the purpose of this asset..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full mt-2 px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition-all resize-none ${
                theme === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>

          <div className="flex gap-4 mt-auto">
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/10 cursor-pointer text-center text-sm transition-all"
            >
              Submit Asset
            </button>
          </div>
        </form>

      </div>

      {/* RIGHT COLUMN: Submitted Documents List */}
      <div className={`flex-1 flex flex-col rounded-3xl border p-6 ${
        theme === 'dark' 
          ? 'bg-slate-900/40 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      } overflow-y-auto custom-scrollbar shadow-2xl backdrop-blur-xl`}>
        
        <div className="mb-6 pb-3 border-b border-slate-800/10 dark:border-slate-100/10 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl leading-tight">Shared Workspace Assets</h2>
            <p className="text-xs text-slate-500 mt-1">Shared files and links visible to everyone in the room.</p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 text-xs font-bold rounded-full">
            {documents.length} Items
          </span>
        </div>

        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-2 text-center">
              <AlertCircle className="w-8 h-8 opacity-40 text-indigo-500" />
              <p className="text-sm font-semibold">No assets submitted yet.</p>
              <p className="text-xs opacity-75 max-w-[200px]">Use the submission panel on the left to share something.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div 
                key={doc.docId}
                className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-950/20 border-slate-850 hover:border-slate-800' 
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                      {doc.type === 'link' && <LinkIcon className="w-4 h-4" />}
                      {doc.type === 'image' && <ImageIcon className="w-4 h-4" />}
                      {doc.type === 'voice' && <Mic className="w-4 h-4" />}
                      {doc.type === 'file' && <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-snug">{doc.title}</h4>
                      <span className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-[10px] font-bold rounded-md uppercase tracking-wider text-slate-400 mt-1 inline-block">
                        {doc.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500">
                    {new Date(doc.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Body details */}
                {doc.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    {doc.description}
                  </p>
                )}

                {/* PREVIEW CONTAINER DEPENDING ON TYPE */}
                <div className="mt-1">
                  {doc.type === 'link' && (
                    <a
                      href={doc.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all"
                    >
                      Open Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {doc.type === 'image' && (
                    <div className="relative max-w-xs rounded-xl overflow-hidden shadow-sm border dark:border-slate-800">
                      <img src={doc.content} alt={doc.title} className="max-h-44 w-full object-cover" />
                      <a
                        href={doc.content}
                        download={doc.title}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80 transition-colors"
                        title="Download Image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {doc.type === 'voice' && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => playVoice(doc.docId, doc.content)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                          playingAudioId === doc.docId
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-indigo-650 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {playingAudioId === doc.docId ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Recorded Audio Memo</p>
                        <span className="text-[10px] opacity-75">Click to listen</span>
                      </div>
                    </div>
                  )}

                  {doc.type === 'file' && (
                    <a
                      href={doc.content}
                      download={doc.title}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download File Asset
                    </a>
                  )}
                </div>

                {/* Footer details */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-850/5 dark:border-slate-800/60 text-[10px] text-slate-500 font-semibold">
                  <User className="w-3 h-3 text-indigo-500" />
                  <span>Submitted by {doc.submittedBy}</span>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
