import { useTranslation } from 'react-i18next';
import { Alert, Card, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

interface RunLog {
  id: string;
  started_at: string;
  duration_ms: number | null;
  collected: number;
  new_jobs: number;
  filtered_out: number;
  scored: number;
  notified: number;
  llm_calls: number;
  errors: string[];
}

export default function Runs() {
  const { t } = useTranslation();
  const runs = useAsync(async () => {
    const { data, error } = await supabase
      .from('jm_run_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as RunLog[];
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('runs.title')}</h1>
      {runs.loading && <Spinner label={t('common.loading')} />}
      {runs.error && <Alert>{runs.error}</Alert>}
      {runs.data && runs.data.length === 0 && <Card>{t('runs.empty')}</Card>}
      {runs.data && runs.data.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                {[
                  'when',
                  'duration',
                  'collected',
                  'newJobs',
                  'filtered',
                  'scored',
                  'notified',
                  'llmCalls',
                  'errors',
                ].map((key) => (
                  <th key={key} className="px-3 py-2 font-medium">
                    {t(`runs.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {runs.data.map((run) => (
                <tr key={run.id} className="align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(run.started_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2">
                    {run.duration_ms === null ? '-' : `${(run.duration_ms / 1000).toFixed(1)}s`}
                  </td>
                  <td className="px-3 py-2">{run.collected}</td>
                  <td className="px-3 py-2">{run.new_jobs}</td>
                  <td className="px-3 py-2">{run.filtered_out}</td>
                  <td className="px-3 py-2">{run.scored}</td>
                  <td className="px-3 py-2">{run.notified}</td>
                  <td className="px-3 py-2">{run.llm_calls}</td>
                  <td className="px-3 py-2">
                    {run.errors.length === 0 ? (
                      '0'
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-red-600">
                          {run.errors.length}
                        </summary>
                        <ul className="mt-1 max-w-xs list-disc pl-4 text-xs text-slate-600 dark:text-slate-300">
                          {run.errors.map((message, index) => (
                            <li key={index}>{message}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
