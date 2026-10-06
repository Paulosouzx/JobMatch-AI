import { jobSchema, type Job } from '../types';
import { asArray, asRecord, asString, htmlToText, toIsoDate } from '../util/text';

export interface CollectedJob {
  job: Job;
  raw: unknown;
}

function build(candidate: unknown, raw: unknown): CollectedJob | null {
  const parsed = jobSchema.safeParse(candidate);
  return parsed.success ? { job: parsed.data, raw } : null;
}

function nullable(value: string): string | null {
  return value === '' ? null : value;
}

export function normalizeRemotive(raw: unknown): CollectedJob | null {
  const r = asRecord(raw);
  const location = asString(r.candidate_required_location);
  return build(
    {
      source: 'remotive',
      externalId: asString(r.id),
      title: asString(r.title),
      company: asString(r.company_name),
      location: nullable(location),
      remote: true,
      description: htmlToText(asString(r.description)),
      url: asString(r.url),
      postedAt: toIsoDate(r.publication_date),
    },
    raw,
  );
}

export function normalizeArbeitnow(raw: unknown): CollectedJob | null {
  const r = asRecord(raw);
  return build(
    {
      source: 'arbeitnow',
      externalId: asString(r.slug),
      title: asString(r.title),
      company: asString(r.company_name),
      location: nullable(asString(r.location)),
      remote: r.remote === true,
      description: htmlToText(asString(r.description)),
      url: asString(r.url),
      postedAt: toIsoDate(r.created_at, 'seconds'),
    },
    raw,
  );
}

export function normalizeRemoteOk(raw: unknown): CollectedJob | null {
  const r = asRecord(raw);
  return build(
    {
      source: 'remoteok',
      externalId: asString(r.id),
      title: asString(r.position),
      company: asString(r.company),
      location: nullable(asString(r.location)),
      remote: true,
      description: htmlToText(asString(r.description)),
      url: asString(r.url) || asString(r.apply_url),
      postedAt: toIsoDate(r.date),
    },
    raw,
  );
}

export function normalizeGreenhouse(raw: unknown, company: string): CollectedJob | null {
  const r = asRecord(raw);
  const location = asString(asRecord(r.location).name);
  return build(
    {
      source: 'greenhouse',
      externalId: `${company}:${asString(r.id)}`,
      title: asString(r.title),
      company: asString(r.company_name) || company,
      location: nullable(location),
      remote: /remote/i.test(location),
      description: htmlToText(asString(r.content)),
      url: asString(r.absolute_url),
      postedAt: toIsoDate(r.first_published ?? r.updated_at),
    },
    raw,
  );
}

export function normalizeLever(raw: unknown, company: string): CollectedJob | null {
  const r = asRecord(raw);
  const categories = asRecord(r.categories);
  const location = asString(categories.location);
  const description =
    asString(r.descriptionPlain) ||
    asString(r.descriptionBodyPlain) ||
    htmlToText(asString(r.description));
  return build(
    {
      source: 'lever',
      externalId: `${company}:${asString(r.id)}`,
      title: asString(r.text),
      company,
      location: nullable(location),
      remote: asString(r.workplaceType).toLowerCase() === 'remote',
      description,
      url: asString(r.hostedUrl) || asString(r.applyUrl),
      postedAt: toIsoDate(r.createdAt, 'millis'),
    },
    raw,
  );
}

export function normalizeAdzuna(raw: unknown): CollectedJob | null {
  const r = asRecord(raw);
  const title = htmlToText(asString(r.title));
  const location = asString(asRecord(r.location).display_name);
  const description = htmlToText(asString(r.description));
  return build(
    {
      source: 'adzuna',
      externalId: asString(r.id),
      title,
      company: asString(asRecord(r.company).display_name) || 'Unknown',
      location: nullable(location),
      remote: /remote|remoto/i.test(`${title} ${description} ${location}`),
      description,
      url: asString(r.redirect_url),
      postedAt: toIsoDate(r.created),
    },
    raw,
  );
}

export function normalizeItJobs(raw: unknown): CollectedJob | null {
  const r = asRecord(raw);
  const locations = asArray(r.locations)
    .map((l) => asString(asRecord(l).name))
    .filter(Boolean);
  const title = asString(r.title);
  const body = htmlToText(asString(r.body));
  const allowRemote = r.allowRemote === true;
  return build(
    {
      source: 'itjobs',
      externalId: asString(r.id),
      title,
      company: asString(asRecord(r.company).name),
      location: nullable(locations.join(', ')),
      remote: allowRemote || /remote|remoto/i.test(`${title} ${body}`),
      description: body,
      url: asString(r.link) || `https://www.itjobs.pt/oferta/${asString(r.id)}`,
      postedAt: toIsoDate(r.publishedAt),
    },
    raw,
  );
}
