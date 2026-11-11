import React from 'react';

interface AmbientGlowProps {
  readonly variant: 'signup' | 'complete';
}

/** Blurred background light blobs from the Stitch designs. */
export const AmbientGlow: React.FC<AmbientGlowProps> = ({ variant }) =>
  variant === 'signup' ? (
    <>
      <div className="absolute w-[540px] h-[540px] max-w-full rounded-full bg-mercury/10 blur-[130px] -top-24 pointer-events-none" />
      <div className="absolute w-[360px] h-[360px] max-w-full rounded-full bg-blue-900/15 blur-[100px] bottom-0 pointer-events-none" />
    </>
  ) : (
    <>
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 bg-mercury/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-64 h-64 bg-blue-900/20 rounded-full blur-[90px] pointer-events-none" />
    </>
  );

export default AmbientGlow;
