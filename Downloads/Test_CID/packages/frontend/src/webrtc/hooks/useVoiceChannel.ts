import { useCallback, useEffect } from 'react';
import { getSocket } from '../../socket/client';
import { useVoiceStore } from '../../store/voiceStore';
import { useAuthStore } from '../../store/authStore';
import { useStreamSettingsStore, QUALITY_MAP } from '../../store/streamSettingsStore';
import { MediaManager } from '../MediaManager';
import { PeerManager } from '../PeerManager';

let voiceJoinGeneration = 0;
let pendingVoiceRoomStateHandler: ((data: any) => void) | null = null;

export function useVoiceChannel() {
  const { user } = useAuthStore();
  const { fps, quality } = useStreamSettingsStore();
  const { width, height } = QUALITY_MAP[quality];
  const {
    activeChannelId, localStream, isMuted, isDeafened, isVideoEnabled, isScreenSharing,
    joiningChannelId, voiceJoinError,
    setActiveChannel, setLocalStream, setMuted, setDeafened, setVideoEnabled, setScreenSharing,
    setJoiningChannelId, setVoiceJoinError,
    participants, reset,
  } = useVoiceStore();

  const socket = getSocket();

  // Handle incoming WebRTC events
  useEffect(() => {
    if (!activeChannelId) return;

    socket.on('webrtc_offer', async ({ from_user_id, sdp }: any) => {
      if (localStream) {
        await PeerManager.handleOffer(from_user_id, sdp, localStream);
      }
    });

    socket.on('webrtc_answer', async ({ from_user_id, sdp }: any) => {
      await PeerManager.handleAnswer(from_user_id, sdp);
    });

    socket.on('webrtc_ice_candidate', async ({ from_user_id, candidate }: any) => {
      await PeerManager.handleIceCandidate(from_user_id, candidate);
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
    };
  }, [activeChannelId, localStream]);

  const joinChannel = useCallback(async (channelId: string) => {
    const store = useVoiceStore.getState();

    if (pendingVoiceRoomStateHandler) {
      socket.off('voice_room_state', pendingVoiceRoomStateHandler);
      pendingVoiceRoomStateHandler = null;
    }

    const { activeChannelId: cur, localStream: prevStream } = store;
    if (cur && cur !== channelId) {
      socket.emit('voice_leave', { channel_id: cur });
      if (prevStream) MediaManager.stopStream(prevStream);
      PeerManager.closeAll();
      store.reset();
    }

    const gen = ++voiceJoinGeneration;
    store.setJoiningChannelId(channelId);
    store.setVoiceJoinError(null);

    let stream: MediaStream;
    try {
      stream = await MediaManager.getAudioStream();
    } catch {
      stream = new MediaStream();
    }

    store.setLocalStream(stream);
    PeerManager.setChannel(channelId);

    const onRoomState = async (payload: any) => {
      socket.off('voice_room_state', onRoomState);
      if (pendingVoiceRoomStateHandler === onRoomState) pendingVoiceRoomStateHandler = null;
      if (gen !== voiceJoinGeneration) return;
      if (payload?.channel_id !== channelId) return;
      const existing = payload.participants ?? [];
      for (const p of existing) {
        if (p.userId !== user?.id) {
          await PeerManager.createOffer(p.userId, stream);
        }
      }
    };
    pendingVoiceRoomStateHandler = onRoomState;
    socket.on('voice_room_state', onRoomState);

    socket.emit('voice_join', { channel_id: channelId }, (res: any) => {
      if (gen !== voiceJoinGeneration) return;
      if (res?.ok) {
        store.setActiveChannel(channelId);
        store.setJoiningChannelId(null);
        store.setVoiceJoinError(null);
      } else {
        socket.off('voice_room_state', onRoomState);
        if (pendingVoiceRoomStateHandler === onRoomState) pendingVoiceRoomStateHandler = null;
        MediaManager.stopStream(stream);
        PeerManager.closeAll();
        store.setLocalStream(null);
        store.setJoiningChannelId(null);
        store.setVoiceJoinError(res?.error || 'Could not join voice channel');
      }
    });
  }, [user?.id, socket]);

  const leaveChannel = useCallback(() => {
    if (pendingVoiceRoomStateHandler) {
      socket.off('voice_room_state', pendingVoiceRoomStateHandler);
      pendingVoiceRoomStateHandler = null;
    }
    voiceJoinGeneration++;
    if (!activeChannelId) return;
    socket.emit('voice_leave', { channel_id: activeChannelId });
    MediaManager.stopStream(localStream);
    PeerManager.closeAll();
    reset();
  }, [activeChannelId, localStream, socket, reset]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    localStream?.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
    if (activeChannelId) socket.emit('voice_mute', { channel_id: activeChannelId, muted: next });
  }, [isMuted, localStream, activeChannelId, socket, setMuted]);

  const toggleDeafen = useCallback(() => {
    const next = !isDeafened;
    setDeafened(next);
    if (activeChannelId) socket.emit('voice_deafen', { channel_id: activeChannelId, deafened: next });
  }, [isDeafened, activeChannelId, socket, setDeafened]);

  const toggleVideo = useCallback(async () => {
    if (isVideoEnabled) {
      localStream?.getVideoTracks().forEach(t => t.stop());
      const newStream = new MediaStream(localStream?.getAudioTracks() ?? []);
      setLocalStream(newStream);
      setVideoEnabled(false);
      if (activeChannelId) socket.emit('video_toggle', { channel_id: activeChannelId, enabled: false });
    } else {
      try {
        const videoStream = await MediaManager.getVideoStream(fps, width, height);
        const videoTrack = videoStream.getVideoTracks()[0];
        const newStream = new MediaStream([
          ...(localStream?.getAudioTracks() ?? []),
          videoTrack,
        ]);
        setLocalStream(newStream);
        setVideoEnabled(true);
        if (activeChannelId) socket.emit('video_toggle', { channel_id: activeChannelId, enabled: true });
      } catch { /* user denied */ }
    }
  }, [isVideoEnabled, localStream, activeChannelId, fps, width, height, socket, setLocalStream, setVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      localStream?.getVideoTracks().forEach(t => t.stop());
      const newStream = new MediaStream(localStream?.getAudioTracks() ?? []);
      setLocalStream(newStream);
      setScreenSharing(false);
      if (activeChannelId) socket.emit('screen_share_stop', { channel_id: activeChannelId });
    } else {
      try {
        const screenStream = await MediaManager.getScreenStream(fps, width, height);
        const screenTrack = screenStream.getVideoTracks()[0];
        const newStream = new MediaStream([
          ...(localStream?.getAudioTracks() ?? []),
          screenTrack,
        ]);
        setLocalStream(newStream);
        screenTrack.onended = () => {
          const audioOnlyStream = new MediaStream(newStream.getAudioTracks());
          setLocalStream(audioOnlyStream);
          setScreenSharing(false);
          const ch = useVoiceStore.getState().activeChannelId;
          if (ch) getSocket().emit('screen_share_stop', { channel_id: ch });
        };
        setScreenSharing(true);
        if (activeChannelId) socket.emit('screen_share_start', { channel_id: activeChannelId });
      } catch { /* user denied */ }
    }
  }, [isScreenSharing, localStream, activeChannelId, fps, width, height, socket, setLocalStream, setScreenSharing]);

  const clearJoinError = useCallback(() => {
    useVoiceStore.getState().setVoiceJoinError(null);
  }, []);

  return {
    activeChannelId,
    joiningChannelId,
    voiceJoinError,
    clearJoinError,
    participants,
    localStream,
    isMuted,
    isDeafened,
    isVideoEnabled,
    isScreenSharing,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
  };
}
