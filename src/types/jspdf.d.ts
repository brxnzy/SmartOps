declare module "jspdf" {
  export class jsPDF {
    constructor(options?: Record<string, unknown>);
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    setFillColor(...args: Array<string | number>): void;
    rect(x: number, y: number, width: number, height: number, style?: string): void;
    roundedRect(
      x: number,
      y: number,
      width: number,
      height: number,
      rx: number,
      ry: number,
      style?: string
    ): void;
    setFont(fontName: string, fontStyle?: string): void;
    setFontSize(size: number): void;
    setTextColor(color: string | number, g?: number, b?: number): void;
    text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): void;
    setDrawColor(...args: Array<string | number>): void;
    setLineWidth(width: number): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    addImage(
      imageData: string | HTMLImageElement | HTMLCanvasElement | Uint8Array,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): void;
    getTextWidth(text: string): number;
    splitTextToSize(text: string, size: number): string[];
    addPage(): void;
    save(filename: string): void;
  }
}
