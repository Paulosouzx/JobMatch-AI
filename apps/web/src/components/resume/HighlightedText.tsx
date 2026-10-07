import { findBannedPhrases } from '@jobmatch/core';
import { Fragment } from 'react';

export function HighlightedText({ text, banned }: { text: string; banned: string[] }) {
  const hits = findBannedPhrases(text, banned);
  if (hits.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach((hit, index) => {
    if (hit.start < cursor) return;
    parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, hit.start)}</Fragment>);
    parts.push(
      <mark
        key={`m${index}`}
        title={hit.phrase}
        className="rounded-sm bg-destructive/15 px-0.5 text-destructive underline decoration-wavy decoration-destructive/60"
      >
        {text.slice(hit.start, hit.end)}
      </mark>,
    );
    cursor = hit.end;
  });
  parts.push(<Fragment key="end">{text.slice(cursor)}</Fragment>);
  return <>{parts}</>;
}
