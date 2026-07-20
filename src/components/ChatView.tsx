import React, { useEffect, useRef, useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { Send, Users, Search, MessageSquare, AlertCircle, Smile } from 'lucide-react';
import { getBackendUrl, getWsUrl } from '../utils/api';

interface ChatMsg {
  senderName: string;
  senderEmail: string;
  content: string;
  roomCode: string;
  timestamp: string;
}

interface ActiveUser {
  fullName: string;
  email: string;
  role?: string;
}

export const ChatView: React.FC = () => {
  const user = useKanbanStore((s) => s.user);
  const theme = useKanbanStore((s) => s.theme);
  
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const roomCode = user?.roomCode || '';

  // Generate color based on email string
  const getUserColor = (email: string) => {
    const colors = [
      'from-rose-500 to-orange-500',
      'from-emerald-500 to-teal-500',
      'from-blue-500 to-indigo-500',
      'from-purple-500 to-pink-500',
      'from-amber-500 to-yellow-500',
      'from-cyan-500 to-blue-500'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Fetch initial chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/collaboration/chat?roomCode=${roomCode}`);
        if (res.ok) {
          const data = await res.ok ? await res.json() : [];
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    if (roomCode) {
      fetchChatHistory();
    }
  }, [roomCode]);

  // Connect to WebSocket
  useEffect(() => {
    if (!roomCode || !user) return;

    const wsUrl = getWsUrl();

    let socket: WebSocket;
    let reconnectTimeout: number;

    const connectWS = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Send join event
        socket.send(JSON.stringify({
          type: 'join',
          roomCode,
          user: {
            fullName: user.fullName,
            email: user.email,
            role: user.role || 'leader'
          }
        }));
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.type === 'chat') {
            setMessages((prev) => [...prev, parsed.message]);
          } else if (parsed.type === 'active_users') {
            setActiveUsers(parsed.users || []);
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          connectWS();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        socket.close();
      };
    };

    connectWS();

    return () => {
      if (socket) {
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [roomCode, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      roomCode,
      senderName: user?.fullName,
      senderEmail: user?.email,
      content: inputText
    }));

    setInputText('');
  };

  const filteredMessages = messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      {/* Main Chat Panel */}
      <div className={`flex-1 flex flex-col rounded-3xl border ${
        theme === 'dark' 
          ? 'bg-slate-900/40 border-slate-800' 
          : 'bg-white border-slate-200'
      } overflow-hidden shadow-2xl backdrop-blur-xl`}>
        
        {/* Chat Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Workspace Chat</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                <span className="text-xs text-slate-500 font-medium">
                  {isConnected ? 'Connected' : 'Reconnecting...'} • Room {roomCode}
                </span>
              </div>
            </div>
          </div>

          {/* Search Messages */}
          <div className="relative max-w-xs hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 rounded-xl text-sm border focus:outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950/40 border-slate-800 focus:border-indigo-500 text-slate-100'
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <AlertCircle className="w-8 h-8 opacity-40 text-indigo-500" />
              <p className="text-sm font-medium">
                {searchQuery ? 'No matching messages found' : 'No messages in this workspace yet.'}
              </p>
              {!searchQuery && <p className="text-xs opacity-75">Send a message to kick off the conversation!</p>}
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              const isSelf = msg.senderEmail === user?.email;
              const initials = msg.senderName
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={idx} className={`flex gap-3 max-w-[80%] ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${getUserColor(msg.senderEmail)} flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0`}>
                    {initials}
                  </div>

                  {/* Bubble Container */}
                  <div className="flex flex-col gap-1">
                    {/* Sender details */}
                    {!isSelf && (
                      <span className="text-[11px] font-semibold text-slate-500 ml-1">
                        {msg.senderName}
                      </span>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
                      isSelf
                        ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-tr-none'
                        : theme === 'dark'
                          ? 'bg-slate-850 text-slate-100 rounded-tl-none border border-slate-800'
                          : 'bg-slate-100 text-slate-900 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    
                    {/* Timestamp */}
                    <span className={`text-[10px] text-slate-500 ${isSelf ? 'text-right mr-1' : 'ml-1'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className={`p-4 border-t ${
          theme === 'dark' ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50/20'
        } flex items-center gap-3`}>
          <button
            type="button"
            title="Insert Emoji"
            onClick={() => setInputText((prev) => prev + ' 😊')}
            className={`p-2.5 rounded-xl border transition-colors ${
              theme === 'dark'
                ? 'border-slate-800 hover:bg-slate-800/50 text-slate-400'
                : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            placeholder="Type your message here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!isConnected}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
              theme === 'dark'
                ? 'bg-slate-950/60 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900 placeholder-slate-400'
            }`}
          />
          
          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className={`p-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Active Users Sidebar */}
      <div className={`w-64 rounded-3xl border p-5 flex flex-col gap-4 ${
        theme === 'dark' 
          ? 'bg-slate-900/20 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      } hidden md:flex overflow-hidden shadow-xl`}>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800/10 dark:border-slate-100/10">
          <Users className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-sm">Active Members ({activeUsers.length})</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {activeUsers.map((member, idx) => {
            const isSelf = member.email === user?.email;
            const initials = member.fullName
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${getUserColor(member.email)} flex items-center justify-center text-white text-xs font-bold`}>
                    {initials}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-none mb-0.5">
                    {member.fullName} {isSelf && <span className="opacity-60 font-normal text-[10px]">(You)</span>}
                  </p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 opacity-80 leading-none">
                    {member.role || 'Member'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
