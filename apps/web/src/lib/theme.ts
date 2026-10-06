import { useCallback, useEffect, useState } from 'react';

function readDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function useTheme() {
  const [dark, setDark] = useState(readDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((current) => {
      const next = !current;
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        return next;
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
