'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
interface Props {
  value: string;
  onChange: (url: string) => void;
}
export default function CoverImageUpload({
  value,
  onChange
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url: string = data.files?.[0]?.url ?? data.uploads?.[0]?.url ?? '';
      if (url) onChange(url);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };
  return <div>
      <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={e => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    }} />

      {value ? <div className='relative w-full max-w-xs group'>
          <img src={value} alt='Cover' className='w-full h-36 object-cover rounded-lg border border-[#E1E3E5]' />
          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center gap-2 transition-opacity'>
            <button type='button' onClick={() => inputRef.current?.click()} className='px-2.5 py-1.5 text-[12px] font-medium bg-white rounded-md cursor-pointer border-none'>
              Replace
            </button>
            <button type='button' onClick={() => onChange('')} className='px-2.5 py-1.5 text-[12px] font-medium bg-white text-[#D82C0D] rounded-md cursor-pointer border-none'>
              Remove
            </button>
          </div>
        </div> : <button type='button' onClick={() => inputRef.current?.click()} disabled={uploading} className='w-full max-w-xs h-36 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#E1E3E5] rounded-lg text-[#6D7175] hover:border-[#008060] hover:text-[#008060] bg-transparent cursor-pointer transition-colors disabled:opacity-60'>
          <span className='text-2xl'>🖼</span>
          <span className='text-[13px] font-medium'>
            {uploading ? 'Uploading...' : 'Click to upload cover image'}
          </span>
        </button>}
    </div>;
}
