// Lithuanian-aware slug helper.
// Strips diacritics (ė → e, š → s, ž → z, ą/ę/į/ų → a/e/i/u) so the same
// service name produces the same slug regardless of the user's keyboard.

const LT_MAP: Record<string, string> = {
  ą: 'a', č: 'c', ę: 'e', ė: 'e', į: 'i', š: 's', ų: 'u', ū: 'u', ž: 'z',
  Ą: 'a', Č: 'c', Ę: 'e', Ė: 'e', Į: 'i', Š: 's', Ų: 'u', Ū: 'u', Ž: 'z',
};

export function slugify(input: string): string {
  return input
    .replace(/[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/g, (ch) => LT_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
