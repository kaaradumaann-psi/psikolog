import type { FormDefinition } from '../omr/omrTypes';
import type { ScanSet } from '../scanner/pageSequence';
import { sortedPages } from '../scanner/pageSequence';
import { hasSuccessfulMeasurements } from '../results/resultValidator';
import { resolveItem } from '../results/resultNormalizer';
import type { ItemAnswer } from '../workspace/caseTypes';

/** Convert only clinically resolved scan evidence. An unread/ambiguous item stays `undefined`
 * (pending), rather than becoming a fabricated cannot-say response. The caller must keep the
 * profile/save flow locked until every item is resolved. */
export function scanToAnswers(definition: FormDefinition, scan: ScanSet): ItemAnswer[] {
  const pages = sortedPages(scan);
  const answers: ItemAnswer[] = Array.from({ length: definition.totalItems }, () => undefined);
  for (const pageDef of definition.pages) {
    const stored = pages.find(p => p.pageNumber === pageDef.pageNumber);
    if (!stored) continue;
    for (const itemDef of pageDef.items) {
      const resolved = resolveItem(itemDef, stored);
      const idx = itemDef.itemNumber - 1;
      if (resolved.review) {
        answers[idx] = resolved.choiceId === 'D' || resolved.choiceId === 'Y' ? resolved.choiceId : null;
      } else if (resolved.reliable) {
        answers[idx] = resolved.choiceId === 'D' || resolved.choiceId === 'Y' ? resolved.choiceId : undefined;
      } else if (resolved.original?.status === 'blank' && hasSuccessfulMeasurements(resolved.original, itemDef)) {
        // A measured blank is a real (?) response; only an unmeasured/uncertain result stays pending.
        answers[idx] = null;
      }
    }
  }
  return answers;
}
