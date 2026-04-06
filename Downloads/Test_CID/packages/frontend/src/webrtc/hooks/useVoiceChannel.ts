import { useCallback, useEffect } from 'react';
import { getSocket } from '../../socket/client';
import { useVoiceStore } from '../../store/voiceStore';
import { useAuthStore } from '../../store/authStore';
import { useStreamSettingsStore, QUALITY_MAP } from '../../store/streamSettingsStore';
import { MediaManager } from '../MediaManager';
import { PeerManager } from '../PeerManager';

export function useVoiceChannel() {
  const { user } = useAuthStore();
  const { fps, quality } = useStreamSettingsStore();
  const { width, height } = QUALITY_MAP[quality];
  const {
    activeChannelId, localStream, isMuted, isDeafened, isVideoEnabled, isScreenSharing,
    setActiveChannel, setLocalStream, setMuted, setDeafened, setVideoEnabled, setScreenSharing,
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
    // Get mic stream — fall back to a silent stream if permission denied / no device
    let stream: MediaStream;
    try {
      stream = await MediaManager.getAudioStream();
    } catch {
      stream = new MediaStream();
    }

    setLocalStream(stream);
    PeerManager.setChannel(channelId);

    // Register listener BEFORE emitting join to avoid the race where
    // the server emits voice_room_state before our ack callback fires
    socket.once('voice_room_state', async ({ participants: existing }: any) => {
      for (const p of existing) {
        if (p.userId !== user?.id) {
          await PeerManager.createOffer(p.userId, stream);
        }
      }
    });

    socket.emit('voice_join', { channel_id: channelId }, (res: any) => {
      if (res?.ok) {
        setActiveChannel(channelId);
      } else {
        socket.off('voice_room_state');
        console.error('voice_join rejected:', res?.error);
      }
    });
  }, [user]);

  const leaveChannel = useCallback(() => {
    if (!activeChannelId) return;
    socket.emit('voice_leave', { channel_id: activeChannelId });
    MediaManager.stopStream(localStream);
    PeerManager.closeAll();
    reset();
  }, [activeChannelId, localStream]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    localStream?.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
    if (activeChannelId) socket.emit('voice_mute', { channel_id: activeChannelId, muted: next });
  }, [isMuted, localStream, activeChannelId]);

  const toggleDeafen = useCallback(() => {
    const next = !isDeafened;
    setDeafened(next);
    if (activeChannelId) socket.emit('voice_deafen', { channel_id: activeChannelId, deafened: next });
  }, [isDeafened, activeChannelId]);

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
      } catch {}
    }
  }, [isVideoEnabled, localStream, activeChannelId]);

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
          if (activeChannelId) socket.emit('screen_share_stop', { channel_id: activeChannelId });
        };
        setScreenSharing(true);
        if (activeChannelId) socket.emit('screen_share_start', { channel_id: activeChannelId });
      } catch {}
    }
  }, [isScreenSharing, localStream, activeChannelId]);

  return {
    activeChannelId,
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
