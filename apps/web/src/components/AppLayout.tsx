import { motion, useReducedMotion } from 'motion/react';
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/app/AppBreadcrumbs';
import { AppSidebar } from '@/components/app/AppSidebar';
import { CommandMenu } from '@/components/app/CommandMenu';
import { preloadAppPages } from '@/components/app/navigation';
import { PageFallback } from '@/components/app/PageFallback';
import { HeaderUserMenu } from '@/components/app/UserMenu';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function AppLayout() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    preloadAppPages();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <div className="hidden min-w-0 flex-1 md:block">
            <AppBreadcrumbs />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
            <div className="min-w-0 flex-1 md:flex-none">
              <CommandMenu />
            </div>
            <HeaderUserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<PageFallback />}>
              <motion.div
                key={pathname}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </Suspense>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
