declare module 'mammoth' {
  export interface ConversionResult {
    value: string;
    messages: Message[];
  }

  export interface Message {
    type: string;
    message: string;
    error?: Error;
  }

  export interface ConversionOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: (image: Image) => Promise<ImageConversion>;
    ignoreEmptyParagraphs?: boolean;
  }

  export interface Image {
    read(encoding?: string): Promise<Buffer>;
    contentType: string;
  }

  export interface ImageConversion {
    src?: string;
  }

  export function extractRawText(options: ConversionOptions): Promise<ConversionResult>;
  export function convertToHtml(options: ConversionOptions): Promise<ConversionResult>;
  export function convertToMarkdown(options: ConversionOptions): Promise<ConversionResult>;
}
