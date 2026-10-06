import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './ui';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="block text-center text-xl font-bold text-indigo-600">
          JobMatch AI
        </Link>
        <Card className="space-y-5 p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          {children}
        </Card>
      </div>
    </main>
  );
}
