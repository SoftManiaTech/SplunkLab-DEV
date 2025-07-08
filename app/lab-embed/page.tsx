'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import * as CryptoJS from 'crypto-js';

// Dynamically import your LabManagerApp-embed (disable SSR)
const LabApp = dynamic(() => import('@/components/LabManagerApp-embed/App'), {
  ssr: false,
});

// Same key as in App.tsx
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'softmania_secret';

function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

export default function LabEmbedPage() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get('code');
    if (code) {
      fetch('/api/oauth/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.email) {
            const loginTime = new Date().getTime();
            localStorage.setItem('userEmail', encrypt(data.email));
            localStorage.setItem('userName', encrypt(data.name));
            localStorage.setItem('loginTime', encrypt(loginTime.toString()));
            router.replace('/lab-embed'); // change URL
            window.location.reload();     // force reload
          }
        });

    }
  }, []);

  return (
    <div className="text-gray-600">
      <LabApp />
    </div>
  );
}
