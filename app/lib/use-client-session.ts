'use client';

import { useEffect, useState } from 'react';

type ClientSessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type ClientSession = {
  user?: ClientSessionUser | null;
  expires?: string;
} | null;

export type ClientSessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useClientSession(): { data: ClientSession; status: ClientSessionStatus } {
  const [session, setSession] = useState<ClientSession>(null);
  const [status, setStatus] = useState<ClientSessionStatus>('loading');

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if (!alive) return;

        if (!response.ok) {
          setSession(null);
          setStatus('unauthenticated');
          return;
        }

        const nextSession = (await response.json()) as ClientSession;
        const hasUser = Boolean(nextSession?.user);
        setSession(hasUser ? nextSession : null);
        setStatus(hasUser ? 'authenticated' : 'unauthenticated');
      } catch {
        if (!alive) return;
        setSession(null);
        setStatus('unauthenticated');
      }
    }

    loadSession();

    return () => {
      alive = false;
    };
  }, []);

  return { data: session, status };
}
