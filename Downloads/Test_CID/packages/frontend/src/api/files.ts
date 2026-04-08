import client from './client';
import { FileAttachment } from '../types/models';

export const filesApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<FileAttachment>('/files/upload', formData, {
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
      },
    }).then(r => r.data);
  },

  getUrl: (fileId: string) => `/api/files/${fileId}`,

  delete: (fileId: string) =>
    client.delete(`/files/${fileId}`).then(r => r.data),
};
