/** Form rectangles use millimetres from the A4 sheet's top-left corner. */
export type RectMm = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };
export type AlignmentMark = RectMm & { id: string };
export type ResponseArea = RectMm & {
  responseId: string;
  choiceId: string;
  label: string;
};
export type ItemDefinition = {
  itemId: string;
  itemNumber: number;
  pageNumber: number;
  columnIndex: number;
  rowIndex: number;
  responseAreas: ResponseArea[];
};
export type PageDefinition = {
  pageNumber: number;
  pageId: string;
  firstItem: number;
  lastItem: number;
  items: ItemDefinition[];
  columns: ItemDefinition[][];
  alignmentMarks: AlignmentMark[];
  qrArea: RectMm;
};
export type FormDefinition = {
  formId: string;
  title: string;
  version: string;
  source: 'unverified-template' | 'provided-authorized';
  sourceReference?: string;
  fingerprint: string;
  pageWidthMm: number;
  pageHeightMm: number;
  totalPages: number;
  totalItems: number;
  pages: PageDefinition[];
};
export type PixelImage = { width: number; height: number; data: Uint8ClampedArray };
export type GrayImage = { width: number; height: number; data: Uint8Array };
export type PageIdentity = {
  version: string;
  fingerprint: string;
  batchId: string;
  pageNumber: number;
  totalPages: number;
};
