'use client';

import VolumeControl from './VolumeControl';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <VolumeControl />
    </>
  );
} 