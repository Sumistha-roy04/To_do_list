import React, { useEffect, useRef, useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { 
  Video, VideoOff, Mic, MicOff, ScreenShare, PhoneOff, Calendar, Clock, Plus, 
  Play, CheckCircle2, Video as VideoIcon, User, AlertCircle
} from 'lucide-react';
import { getBackendUrl, getWsUrl } from '../utils/api';

interface Meeting {
  meetingId: string;
  title: string;
  description?: string;
  scheduledTime: string;
  duration: number;
  status: 'upcoming' | 'live' | 'completed';
  hostName: string;
  hostEmail: string;
}

export const MeetingsView: React.FC = () => {
  const user = useKanbanStore((s) => s.user);
  const theme = useKanbanStore((s) => s.theme);
  const roomCode = user?.roomCode || '';

  // Meetings states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  
  // Call States
  const [isInCall, setIsInCall] = useState(false);
  const [activeCallMeeting, setActiveCallMeeting] = useState<Meeting | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Bind remote stream to HTML video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Fetch Meetings
  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/collaboration/meetings?roomCode=${roomCode}`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    }
  };

  useEffect(() => {
    if (roomCode) {
      fetchMeetings();
    }
  }, [roomCode]);

  // WebRTC Handshake & Signaling Helpers
  const createPeerConnection = (remoteEmail: string): RTCPeerConnection => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;
    
    // Add local tracks
    const stream = localStream || (localVideoRef.current?.srcObject as MediaStream);
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }
    
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          roomCode,
          targetEmail: remoteEmail,
          senderEmail: user?.email,
          signal: { type: 'candidate', candidate: event.candidate }
        }));
      }
    };
    
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };
    
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStream(null);
      }
    };
    
    return pc;
  };

  const initiateCall = async (remoteEmail: string) => {
    const pc = createPeerConnection(remoteEmail);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    wsRef.current?.send(JSON.stringify({
      type: 'signal',
      roomCode,
      targetEmail: remoteEmail,
      senderEmail: user?.email,
      signal: { type: 'offer', offer }
    }));
  };

  const handleOffer = async (remoteEmail: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(remoteEmail);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    wsRef.current?.send(JSON.stringify({
      type: 'signal',
      roomCode,
      targetEmail: remoteEmail,
      senderEmail: user?.email,
      signal: { type: 'answer', answer }
    }));
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  };

  const handleRemotePeerLeave = () => {
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  // Connect WebSockets for live meeting updates & WebRTC signaling
  useEffect(() => {
    if (!roomCode) return;
    const wsUrl = getWsUrl();

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomCode,
        user: { fullName: user?.fullName, email: user?.email }
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'meeting_update') {
          fetchMeetings();
        } else if (parsed.type === 'signal') {
          const { senderEmail, signal } = parsed;
          if (signal.type === 'join') {
            await initiateCall(senderEmail);
          } else if (signal.type === 'offer') {
            await handleOffer(senderEmail, signal.offer);
          } else if (signal.type === 'answer') {
            await handleAnswer(signal.answer);
          } else if (signal.type === 'candidate') {
            await handleCandidate(signal.candidate);
          } else if (signal.type === 'leave') {
            handleRemotePeerLeave();
          }
        }
      } catch (e) {
        console.error('WS message parsing error:', e);
      }
    };

    return () => {
      socket.close();
    };
  }, [roomCode, localStream]);

  // Camera & Audio Control
  const startCamera = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
      setIsAudioOn(true);
      return stream;
    } catch (err) {
      console.warn('Could not get local media stream:', err);
      return null;
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Replace video track in RTCPeerConnection if active
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        }

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            if (peerConnectionRef.current) {
              const senders = peerConnectionRef.current.getSenders();
              const videoSender = senders.find(s => s.track && s.track.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(localStream.getVideoTracks()[0]);
              }
            }
          }
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    } else {
      setIsScreenSharing(false);
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(localStream.getVideoTracks()[0]);
          }
        }
      }
    }
  };

  const handleJoinCall = async (meeting: Meeting) => {
    setActiveCallMeeting(meeting);
    setIsInCall(true);
    const stream = await startCamera();
    
    // Broadcast join signal to others in the room
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'signal',
        roomCode,
        senderEmail: user?.email,
        signal: { type: 'join' }
      }));
    }
    
    // Update status to Live if it's upcoming
    if (meeting.status === 'upcoming') {
      try {
        await fetch(`${getBackendUrl()}/api/collaboration/meetings/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: meeting.meetingId, status: 'live' })
        });
        
        wsRef.current?.send(JSON.stringify({ type: 'meeting_update', roomCode }));
        fetchMeetings();
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    }
  };

  const handleLeaveCall = async () => {
    // Notify remote peers that we are leaving
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'signal',
        roomCode,
        senderEmail: user?.email,
        signal: { type: 'leave' }
      }));
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    stopCamera();
    setIsInCall(false);
    
    if (activeCallMeeting && activeCallMeeting.status === 'live') {
      // Completed meeting status update
      try {
        await fetch(`${getBackendUrl()}/api/collaboration/meetings/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: activeCallMeeting.meetingId, status: 'completed' })
        });
        wsRef.current?.send(JSON.stringify({ type: 'meeting_update', roomCode }));
        fetchMeetings();
      } catch (err) {
        console.error('Failed to complete meeting:', err);
      }
    }
    setActiveCallMeeting(null);
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTime) return;

    const meetingId = 'meet_' + Math.random().toString(36).substring(2, 9);
    
    try {
      const res = await fetch(`${getBackendUrl()}/api/collaboration/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          title: newTitle,
          scheduledTime: newTime,
          duration: parseInt(newDuration),
          hostName: user?.fullName || 'Host',
          hostEmail: user?.email || '',
          roomCode
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewTime('');
        setNewDuration('30');
        setShowScheduleForm(false);
        wsRef.current?.send(JSON.stringify({ type: 'meeting_update', roomCode }));
        fetchMeetings();
      }
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
    }
  };

  // Helper formatting dates
  const formatMeetingTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar pr-2">
      
      {/* Video Call Interface */}
      <div className={`rounded-3xl border overflow-hidden p-4 md:p-6 ${
        theme === 'dark'
          ? 'bg-slate-900/40 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      } shadow-xl backdrop-blur-xl`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-sm md:text-lg truncate max-w-[200px] md:max-w-none">
              {isInCall ? `Active Call: ${activeCallMeeting?.title}` : 'Video Conference'}
            </h2>
          </div>
          {isInCall && (
            <span className="px-3 py-1 bg-rose-500/20 text-rose-500 text-[10px] md:text-xs font-bold rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>

        {isInCall ? (
          /* ACTIVE VIDEO CALL LAYOUT */
          <div className="flex flex-col gap-4">
            {/* Grid of video streams */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:h-[350px]">
              {/* Local Stream */}
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-indigo-500/30 aspect-video md:aspect-auto md:h-full">
                {localStream && isVideoOn ? (
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-450 p-2 text-center">
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-slate-800 flex items-center justify-center text-sm md:text-xl font-bold border border-slate-700/30">
                      {user?.fullName[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] md:text-xs font-medium">Video Off</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-lg text-[9px] md:text-xs text-white backdrop-blur-sm font-semibold truncate max-w-[80px] md:max-w-none">
                  You ({user?.fullName.split(' ')[0]})
                </div>
              </div>

              {/* Remote Participant Stream */}
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center border border-slate-800 aspect-video md:aspect-auto md:h-full">
                {remoteStream ? (
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 md:gap-3 text-slate-450 p-2 text-center">
                    <div className="relative">
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-indigo-650/20 flex items-center justify-center text-indigo-400 text-sm md:text-xl font-bold border border-indigo-500/20">
                        <User className="w-5 h-5 md:w-8 md:h-8" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-650 border border-slate-950 rounded-full"></span>
                    </div>
                    <div className="text-center max-w-[120px] md:max-w-[200px]">
                      <p className="text-[10px] md:text-sm font-semibold text-slate-200 truncate">Remote User</p>
                      <p className="text-[9px] md:text-xs opacity-75 leading-none md:mt-0.5">Connecting...</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-lg text-[9px] md:text-xs text-white backdrop-blur-sm font-semibold">
                  Remote
                </div>
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="flex justify-center items-center gap-2.5 md:gap-4 py-2.5 mt-2 bg-slate-950/20 dark:bg-slate-950/40 rounded-2xl border border-slate-800/10 dark:border-slate-800/60 p-2 md:p-3">
              <button
                onClick={toggleAudio}
                title={isAudioOn ? 'Mute Mic' : 'Unmute Mic'}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isAudioOn 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {isAudioOn ? <Mic className="w-4.5 h-4.5 md:w-5 md:h-5" /> : <MicOff className="w-4.5 h-4.5 md:w-5 md:h-5" />}
              </button>
              <button
                onClick={toggleVideo}
                title={isVideoOn ? 'Stop Video' : 'Start Video'}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isVideoOn 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {isVideoOn ? <Video className="w-4.5 h-4.5 md:w-5 md:h-5" /> : <VideoOff className="w-4.5 h-4.5 md:w-5 md:h-5" />}
              </button>
              <button
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Stop Share' : 'Share Screen'}
                className={`hidden md:flex w-12 h-12 rounded-2xl items-center justify-center transition-all cursor-pointer ${
                  isScreenSharing 
                    ? 'bg-indigo-650 hover:bg-indigo-755 text-white animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <ScreenShare className="w-5 h-5" />
              </button>
              <button
                onClick={handleLeaveCall}
                title="Decline / End Call"
                className="px-3.5 md:px-5 h-10 md:h-12 rounded-xl md:rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-rose-600/10 font-bold text-xs md:text-sm active:scale-[0.98]"
              >
                <PhoneOff className="w-4 h-4 md:w-4.5 md:h-4.5" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        ) : (
          /* IDLE PREVIEW LAYOUT */
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/10 dark:border-slate-800/80 rounded-2xl p-8 md:p-12 text-center text-slate-500 gap-3 bg-slate-500/5">
            <VideoIcon className="w-12 h-12 opacity-35 text-indigo-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No Active Meeting Joined</h3>
            <p className="text-xs md:text-sm max-w-sm md:max-w-md opacity-85 leading-relaxed">
              Launch or join one of your scheduled workspace meetings below to kickstart a voice/video call with your team members.
            </p>
          </div>
        )}
      </div>

      {/* Scheduler and Upcoming Meetings - Hidden during active call for optimal screen fit */}
      {!isInCall && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Scheduled List Section */}
          <div className={`lg:col-span-2 rounded-3xl border p-4 md:p-6 flex flex-col gap-4 ${
            theme === 'dark'
              ? 'bg-slate-900/40 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          } shadow-xl backdrop-blur-xl`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800/10 dark:border-slate-100/10 gap-3">
              <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Workspace Meetings
              </h3>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="w-full sm:w-auto px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/15"
              >
                <Plus className="w-4 h-4" />
                Schedule Meeting
              </button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar">
              {meetings.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <AlertCircle className="w-8 h-8 opacity-45 text-indigo-500" />
                  <p className="text-xs md:text-sm font-medium">No meetings scheduled for this workspace.</p>
                </div>
              ) : (
                meetings.map((meet) => (
                  <div 
                    key={meet.meetingId} 
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      meet.status === 'live' 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : meet.status === 'completed'
                          ? 'opacity-60 bg-slate-500/5 border-slate-800/20'
                          : theme === 'dark' 
                            ? 'bg-slate-950/20 border-slate-850 hover:border-slate-800' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        meet.status === 'live'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : meet.status === 'completed'
                            ? 'bg-slate-500/20 text-slate-500'
                            : 'bg-indigo-500/10 text-indigo-500'
                      }`}>
                        <VideoIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-snug">{meet.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-xs mt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {formatMeetingTime(meet.scheduledTime)} ({meet.duration} mins)
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>Host: {meet.hostName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0 flex justify-end">
                      {meet.status === 'live' ? (
                        <button
                          onClick={() => handleJoinCall(meet)}
                          className="w-full sm:w-auto px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Join Call
                        </button>
                      ) : meet.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinCall(meet)}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          Start Now
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Schedule Form Panel */}
          {showScheduleForm && (
            <div className={`rounded-3xl border p-5 md:p-6 flex flex-col gap-4 ${
              theme === 'dark'
                ? 'bg-slate-900/40 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            } shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-255`}>
              <h3 className="font-bold text-base">Schedule New Meeting</h3>
              
              <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meeting Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Standup"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className={`w-full mt-1.5 px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className={`w-full mt-1.5 px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration (Minutes)</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className={`w-full mt-1.5 px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition-all ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-850 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1.5 Hours</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-1.5 font-semibold">
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(false)}
                    className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      theme === 'dark' ? 'border-slate-800 hover:bg-slate-850 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center shadow-md shadow-indigo-600/10"
                  >
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
