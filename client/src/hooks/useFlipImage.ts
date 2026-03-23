import { useState, useEffect } from 'react';

export function useFlipImage(img0: string | null, speedMs: number) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!img0) return;
    const id = setInterval(() => setFrame(f => (f + 1) % 2), speedMs);
    return () => clearInterval(id);
  }, [img0, speedMs]);

  if (!img0) return null;
  return frame === 0 ? img0 : img0.replace('/0.jpg', '/1.jpg');
}
