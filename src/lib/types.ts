export type PinType = "text" | "photo";

export type PinSource = "manual" | "whatsapp";

export interface Pin {
  id: string;
  type: PinType;
  content: string;
  media?: string;
  x: number;
  y: number;
  color: string;
  source: PinSource;
  createdAt: string;
}
