/** Payload sent to renderer for the screen/window picker (no Node-only types). */
export type DisplayMediaPickerSource = {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  thumbnailDataUrl: string;
};

export type DisplayMediaPickerOpenPayload = {
  sources: DisplayMediaPickerSource[];
};
