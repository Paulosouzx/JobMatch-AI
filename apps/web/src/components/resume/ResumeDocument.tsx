import type { ResumeFields, ResumeStructure } from '@jobmatch/core';

function Subtitle({ text }: { text: string }) {
  const [company, ...rest] = text.split(' — ');
  if (rest.length === 0)
    return (
      <p className="resume-subtitle">
        <em>{text}</em>
      </p>
    );
  return (
    <p className="resume-subtitle">
      <strong>
        <em>{company}</em>
      </strong>
      <em> — {rest.join(' — ')}</em>
    </p>
  );
}

export function ResumeDocument({
  structure,
  fields,
}: {
  structure: ResumeStructure;
  fields: ResumeFields;
}) {
  const text = (key: string) => fields[key] ?? '';
  return (
    <article className="resume-doc">
      <header className="resume-header">
        <h1>{structure.name}</h1>
        {structure.links.length > 0 && (
          <p className="resume-links">{structure.links.join('   ·   ')}</p>
        )}
        {structure.contact && <p className="resume-contact">{structure.contact}</p>}
      </header>
      {structure.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="resume-section">
          <h2>{section.title}</h2>
          {section.type === 'summary' && <p>{text(section.field)}</p>}
          {section.type === 'education' &&
            section.items.map((item, index) => (
              <div key={index} className="resume-item">
                <div className="resume-row">
                  <strong>{item.school}</strong>
                  <span>{item.location}</span>
                </div>
                <div className="resume-row">
                  <span>{item.degree}</span>
                  <span>{item.dates}</span>
                </div>
              </div>
            ))}
          {section.type === 'skills' && (
            <div className="resume-skills">
              {section.groups.map((group) => (
                <p key={group.field}>
                  <strong>{group.label}:</strong> {text(group.field)}
                </p>
              ))}
            </div>
          )}
          {section.type === 'experience' &&
            section.items.map((item, index) => (
              <div key={index} className="resume-item">
                <div className="resume-row">
                  <strong>{item.heading}</strong>
                  <span>{item.dates}</span>
                </div>
                {item.subtitle && <Subtitle text={item.subtitle} />}
                {item.stackField && (
                  <>
                    {item.stackLabel && <p className="resume-stack-label">{item.stackLabel}</p>}
                    <p className="resume-stack">
                      <em>{text(item.stackField)}</em>
                    </p>
                  </>
                )}
                <ul>
                  {item.bullets.map((key) => (
                    <li key={key}>{text(key)}</li>
                  ))}
                </ul>
              </div>
            ))}
          {section.type === 'list' && (
            <ul>
              {section.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
