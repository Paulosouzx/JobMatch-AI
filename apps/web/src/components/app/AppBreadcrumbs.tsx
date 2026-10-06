import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const LABELS: Record<string, string> = {
  profile: 'nav.profile',
  settings: 'nav.settings',
  runs: 'nav.runs',
  design: 'nav.design',
};

export function AppBreadcrumbs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const parts = pathname
    .replace(/^\/app\/?/, '')
    .split('/')
    .filter(Boolean);

  const crumbs: { label: string; to?: string }[] = [];
  if (parts.length === 0 || parts[0] === 'jobs') {
    crumbs.push({ label: t('nav.jobs'), to: parts.length > 0 ? '/app' : undefined });
    if (parts[0] === 'jobs' && parts[1]) crumbs.push({ label: t('nav.jobDetail') });
  } else {
    const key = LABELS[parts[0] ?? ''];
    crumbs.push({ label: key ? t(key) : t('notFound.title') });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.to ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
