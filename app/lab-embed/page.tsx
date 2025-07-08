import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const LabEmbedWrapper = dynamic(() => import('@/components/LabEmbedWrapper'), {
  ssr: false,
});

export default function LabEmbedPage() {
  return (
    <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
      <LabEmbedWrapper />
    </Suspense>
  );
}
