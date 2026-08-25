'use client';

import { useState } from 'react';
import { FacebookIcon, TwitterIcon, MailIcon, CopyIcon, CheckIcon } from '@/components/ui/Icons';
interface Props {
  url: string;
  title: string;
}
export default function ShareRow({
  url,
  title
}: Props) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const btnClass = 'w-9 h-9 rounded-full bg-[#F5F3EF] hover:bg-[#0A1F44]/10 flex items-center justify-center text-[#0A1F44] transition-colors';
  return <div className='flex items-center gap-2'>
      <span className='text-[11px] font-montserrat font-bold text-gray-400 uppercase tracking-wide mr-1'>
        Share
      </span>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target='_blank' rel='noopener noreferrer' aria-label='Share on Facebook' className={btnClass}>
        <FacebookIcon size={15} />
      </a>
      <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target='_blank' rel='noopener noreferrer' aria-label='Share on X' className={btnClass}>
        <TwitterIcon size={15} />
      </a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`} aria-label='Share by email' className={btnClass}>
        <MailIcon size={15} />
      </a>
      <button type='button' onClick={handleCopy} aria-label='Copy link' className={btnClass}>
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
      </button>
    </div>;
}
