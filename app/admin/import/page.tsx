import React from 'react';
import USDAImporter from '@/components/USDAImporter';

export default function ImportPage() {
  return React.createElement(
    'main',
    { className: 'min-h-screen bg-slate-950 p-8 flex items-center justify-center' },
    React.createElement(USDAImporter, null)
  );
}