export interface DeviceInfo {
  deviceId: string;
  label: string;
}

class MediaManagerClass {
  async getAudioStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  async getVideoStream(fps: number = 30, width: number = 1280, height: number = 720): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: fps, max: fps } },
    });
  }

  async getScreenStream(fps: number = 30, width: number = 1280, height: number = 720): Promise<MediaStream> {
    return (navigator.mediaDevices as any).getDisplayMedia({
      video: { width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: fps, max: fps } },
      audio: true,
    });
  }

  async getAudioDevices(): Promise<DeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 6)}` }));
  }

  async getVideoDevices(): Promise<DeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));
  }

  stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach(t => t.stop());
  }

  createVolumeAnalyser(stream: MediaStream): () => number {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      return () => {
        analyser.getByteFrequencyData(data);
        return data.reduce((a, b) => a + b, 0) / data.length / 255;
      };
    } catch {
      return () => 0;
    }
  }
}

export const MediaManager = new MediaManagerClass();
