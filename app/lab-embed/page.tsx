import { Suspense } from 'react';
import LabEmbedWrapper from '@/components/LabEmbedWrapper';

export default function LabEmbedPage() {
  return (
    <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
      <LabEmbedWrapper />
    </Suspense>
  );
}
