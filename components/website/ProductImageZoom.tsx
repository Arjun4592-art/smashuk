'use client';

import { useRef, useState } from 'react';
interface Props {
  src: string;
  alt: string;
  zoom?: number;
  children?: React.ReactNode;
}
export default function ProductImageZoom({
  src,
  alt,
  zoom = 1.8,
  children
}: Props) {
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({
    x: 50,
    y: 50
  });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const pctX = relX / rect.width * 100;
    const pctY = relY / rect.height * 100;
    setPos({
      x: Math.min(Math.max(pctX, 0), 100),
      y: Math.min(Math.max(pctY, 0), 100)
    });
  };
  return <div ref={imgWrapRef} onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)} onMouseMove={handleMouseMove} className='relative aspect-square bg-[#F2F4F7] rounded-2xl overflow-hidden cursor-zoom-in'>
      {}
      {}
      <img src={src} alt={alt} className='w-full h-full object-cover' />
      {children}

      {}
      {active && <div className='hidden lg:block absolute inset-0 bg-no-repeat transition-[background-position] duration-75 ease-out' style={{
      backgroundImage: `url(${src})`,
      backgroundSize: `${zoom * 100}%`,
      backgroundPosition: `${pos.x}% ${pos.y}%`
    }} />}
    </div>;
}
