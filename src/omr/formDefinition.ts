import { sha256 } from '@noble/hashes/sha2.js';
import type { FormDefinition, ItemDefinition, PageDefinition } from './omrTypes';

export const FORM = {
  templateId: 'MMPI566-DY-3C48-V2',
  totalItems: 566,
  columnCount: 3,
  rowsPerColumn: 48,
  pageWidthMm: 210,
  pageHeightMm: 297,
  contentLeftMm: 20,
  contentWidthMm: 170,
  gridTopMm: 60,
  gridHeaderMm: 7,
  columnGapMm: 8,
  rowPitchMm: 4.25,
  bubbleDiameterMm: 3.5,
  markerInsetMm: 10,
  markerSizeMm: 5,
  qrArea: { x: 164, y: 18, width: 26, height: 26 },
  choices: [
    { code: 'D', label: 'Doğru', centerInColumnMm: 27 },
    { code: 'Y', label: 'Yanlış', centerInColumnMm: 43 },
  ],
} as const;

export type AnswerChoice = (typeof FORM.choices)[number]['code'];
export const COLUMN_WIDTH_MM = (FORM.contentWidthMm - (FORM.columnCount - 1) * FORM.columnGapMm) / FORM.columnCount;
export const ITEMS_PER_PAGE = FORM.columnCount * FORM.rowsPerColumn;

// This explicitly labelled fixture contains numbers, not test statements or a key.
// An authorized host can provide its own validated FormDefinition instead.
export function createTemplateDefinition(itemNumbers: readonly number[]): FormDefinition {
  if (!itemNumbers.length || new Set(itemNumbers).size !== itemNumbers.length ||
    itemNumbers.some(n => !Number.isInteger(n) || n < 1)) throw new Error('Madde listesi geçersiz.');
  const totalPages = Math.ceil(itemNumbers.length / ITEMS_PER_PAGE);
  const marks = [
    { id: 'top-left', x: 10, y: 10, width: 5, height: 5 },
    { id: 'top-right', x: 195, y: 10, width: 5, height: 5 },
    { id: 'bottom-right', x: 195, y: 282, width: 5, height: 5 },
    { id: 'bottom-left', x: 10, y: 282, width: 5, height: 5 },
  ];
  const pages: PageDefinition[] = Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const pageNumbers = itemNumbers.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
    const items: ItemDefinition[] = pageNumbers.map((itemNumber, index) => {
      const columnIndex = Math.floor(index / FORM.rowsPerColumn);
      const rowIndex = index % FORM.rowsPerColumn;
      const itemId = `item-${itemNumber}`;
      const y = FORM.gridTopMm + FORM.gridHeaderMm + (rowIndex + .5) * FORM.rowPitchMm - FORM.bubbleDiameterMm / 2;
      return { itemId, itemNumber, pageNumber, columnIndex, rowIndex,
        responseAreas: FORM.choices.map(choice => ({
          responseId: `${itemId}-${choice.code}`, choiceId: choice.code, label: choice.label,
          x: FORM.contentLeftMm + columnIndex * (COLUMN_WIDTH_MM + FORM.columnGapMm)
            + choice.centerInColumnMm - FORM.bubbleDiameterMm / 2,
          y, width: FORM.bubbleDiameterMm, height: FORM.bubbleDiameterMm,
        })),
      };
    });
    return {
      pageNumber, pageId: `${FORM.templateId}-P${pageNumber}`,
      firstItem: pageNumbers[0]!, lastItem: pageNumbers.at(-1)!, items,
      columns: Array.from({ length: FORM.columnCount }, (_, i) => items.filter(item => item.columnIndex === i)),
      alignmentMarks: marks.map(mark => ({ ...mark })), qrArea: { ...FORM.qrArea },
    };
  });
  const definition = {
    formId: FORM.templateId, title: 'MMPI-566', version: '2.0.0', source: 'unverified-template' as const,
    pageWidthMm: FORM.pageWidthMm, pageHeightMm: FORM.pageHeightMm,
    totalPages, totalItems: itemNumbers.length, pages,
  };
  const fingerprint = Array.from(sha256(new TextEncoder().encode(JSON.stringify(definition))))
    .map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  return { ...definition, fingerprint };
}

export const formDefinition = createTemplateDefinition(Array.from({ length: FORM.totalItems }, (_, i) => i + 1));
export const FORM_PAGES = formDefinition.pages;
export const PAGE_COUNT = formDefinition.totalPages;

export function getBubbleGeometry(itemNumber: number, choice: AnswerChoice) {
  const item = formDefinition.pages.flatMap(page => page.items).find(item => item.itemNumber === itemNumber);
  const area = item?.responseAreas.find(area => area.choiceId === choice);
  if (!item || !area) throw new RangeError('Madde veya seçenek tanımda bulunamadı.');
  return { page: item.pageNumber, xMm: area.x + area.width / 2, yMm: area.y + area.height / 2, diameterMm: area.width };
}
