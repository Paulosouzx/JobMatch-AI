const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?<![\w])(?:\+|00)?\d[\d\s().-]{7,}\d(?![\w])/g;
const ADDRESS_LINE =
  /^\s*(?:address|morada|endere[cç]o)\b.*$|^.*\b(?:rua|av\.|avenida|travessa|pra[cç]a|street|road|rd\.|calle|stra[sß]e)\b.*\d.*$|^.*\b\d{4}-\d{3}\b.*$|^.*\b\d{5}-\d{3}\b.*$/gim;

export function stripPii(text: string): string {
  return text
    .replace(EMAIL, '[email removed]')
    .replace(ADDRESS_LINE, '[address removed]')
    .replace(PHONE, '[phone removed]');
}
