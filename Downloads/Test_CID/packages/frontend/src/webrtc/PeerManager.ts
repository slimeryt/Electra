import { getSocket } from '../socket/client';
import { useVoiceStore } from '../store/voiceStore';

const STUN_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class PeerManagerClass {
  private peers = new Map<string, RTCPeerConnection>();
  private channelId: string | null = null;

  setChannel(channelId: string) {
    this.channelId = channelId;
  }

  async createOffer(targetUserId: string, localStream: MediaStream) {
    const pc = this.createPeer(targetUserId, localStream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    getSocket().emit('webrtc_offer', {
      channel_id: this.channelId,
      target_user_id: targetUserId,
      sdp: pc.localDescription,
    });
  }

  async handleOffer(fromUserId: string, sdp: RTCSessionDescriptionInit, localStream: MediaStream) {
    const pc = this.createPeer(fromUserId, localStream);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    getSocket().emit('webrtc_answer', {
      channel_id: this.channelId,
      target_user_id: fromUserId,
      sdp: pc.localDescription,
    });
  }

  async handleAnswer(fromUserId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peers.get(fromUserId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(fromUserId);
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  }

  private createPeer(userId: string, localStream: MediaStream): RTCPeerConnection {
    if (this.peers.has(userId)) return this.peers.get(userId)!;

    const pc = new RTCPeerConnection(STUN_CONFIG);
    this.peers.set(userId, pc);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit('webrtc_ice_candidate', {
          channel_id: this.channelId,
          target_user_id: userId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      const t = e.track;
      if (t && !remoteStream.getTracks().some((x) => x.id === t.id)) {
        remoteStream.addTrack(t);
      }
      useVoiceStore.getState().setRemoteStream(userId, remoteStream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(userId);
      }
    };

    return pc;
  }

  removePeer(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
      useVoiceStore.getState().removeRemoteStream(userId);
    }
  }

  closeAll() {
    for (const [userId] of this.peers) this.removePeer(userId);
    this.channelId = null;
  }
}

export const PeerManager = new PeerManagerClass();
