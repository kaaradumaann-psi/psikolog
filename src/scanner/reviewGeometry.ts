import type { FormDefinition, ItemDefinition, RectMm } from '../omr/omrTypes';

export function itemRowRect(item: ItemDefinition, definition: FormDefinition): RectMm {
  const areas = item.responseAreas;
  if (!areas.length) return { x: 0, y: 0, width: definition.pageWidthMm, height: definition.pageHeightMm };
  const left = Math.min(...areas.map(area => area.x));
  const top = Math.min(...areas.map(area => area.y));
  const right = Math.max(...areas.map(area => area.x + area.width));
  const bottom = Math.max(...areas.map(area => area.y + area.height));
  const x = Math.max(0, left - 28);
  const y = Math.max(0, top - 1.5);
  return { x, y, width: Math.min(definition.pageWidthMm, right + 5) - x,
    height: Math.min(definition.pageHeightMm, bottom + 1.5) - y };
}
