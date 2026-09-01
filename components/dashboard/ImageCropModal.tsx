'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

interface Props {
  /** Object URL / data URL of the image being cropped */
  imageSrc: string
  /** Original filename, reused for the cropped output file */
  fileName: string
  /** Original mime type, reused for the cropped output file */
  fileType: string
  /** Optional fixed aspect ratio (width / height). Omit to allow free-form resizing. */
  aspect?: number
  onCancel: () => void
  onConfirm: (croppedFile: File) => void
}

async function getCroppedFile(
  imageSrc: string,
  cropPixels: Area,
  fileName: string,
  fileType: string,
  outputType: string,
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cropPixels.width)
  canvas.height = Math.round(cropPixels.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  )
  const mime = outputType || fileType || 'image/jpeg'
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop failed'))),
      mime,
      0.92,
    )
  })
  const ext = mime.split('/')[1] ?? 'jpg'
  const baseName = fileName.replace(/\.[^./\\]+$/, '')
  const outputName =
    mime === (fileType || 'image/jpeg') ? fileName : `${baseName}.${ext}`
  return new File([blob], outputName, {
    type: mime,
  })
}

const ASPECT_PRESETS: {
  label: string
  value?: number
}[] = [
  {
    label: 'Free',
    value: undefined,
  },
  {
    label: '1:1',
    value: 1,
  },
  {
    label: '4:3',
    value: 4 / 3,
  },
  {
    label: '16:9',
    value: 16 / 9,
  },
  {
    label: '3:4',
    value: 3 / 4,
  },
]

export default function ImageCropModal({
  imageSrc,
  fileName,
  fileType,
  aspect: initialAspect,
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(initialAspect)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [convertToWebp, setConvertToWebp] = useState(false)
  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])
  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const outputType = convertToWebp ? 'image/webp' : fileType
      const file = await getCroppedFile(
        imageSrc,
        croppedAreaPixels,
        fileName,
        fileType,
        outputType,
      )
      onConfirm(file)
    } finally {
      setProcessing(false)
    }
  }
  return (
    <div className='fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4'>
      <div className='bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl'>
        <div className='px-5 py-4 border-b border-[#E1E3E5] flex items-center justify-between'>
          <h3 className='font-sora text-[15px] font-semibold text-[#202223]'>
            Resize / Crop Image
          </h3>
          <button
            type='button'
            onClick={onCancel}
            className='text-[#8C9196] hover:text-[#202223] text-lg leading-none cursor-pointer border-none bg-transparent'
          >
            ✕
          </button>
        </div>

        <div className='relative w-full h-80 bg-[#1a1a1a]'>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className='px-5 py-4 space-y-4'>
          <div>
            <p className='text-[11px] font-medium text-[#6D7175] mb-1.5 uppercase tracking-wide'>
              Aspect Ratio
            </p>
            <div className='flex flex-wrap gap-2'>
              {ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type='button'
                  onClick={() => setAspect(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors ${aspect === preset.value ? 'bg-[#008060] text-white border-[#008060]' : 'bg-white text-[#202223] border-[#E1E3E5] hover:border-[#8C9196]'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className='text-[11px] font-medium text-[#6D7175] mb-1.5 uppercase tracking-wide'>
              Zoom
            </p>
            <input
              type='range'
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className='w-full accent-[#008060]'
            />
          </div>

          {fileType !== 'image/webp' && (
            <label className='flex items-center gap-2 cursor-pointer select-none'>
              <input
                type='checkbox'
                checked={convertToWebp}
                onChange={(e) => setConvertToWebp(e.target.checked)}
                className='w-4 h-4 accent-[#008060] cursor-pointer'
              />
              <span className='text-[12.5px] text-[#202223]'>
                Convert to WebP
                <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                  (smaller file size)
                </span>
              </span>
            </label>
          )}
        </div>

        <div className='px-5 py-4 border-t border-[#E1E3E5] flex items-center justify-end gap-2.5'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 rounded-lg text-[13px] font-medium text-[#202223] border border-[#E1E3E5] hover:bg-[#F6F6F7] cursor-pointer'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
            className='px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-[#008060] hover:bg-[#006e52] disabled:opacity-60 cursor-pointer'
          >
            {processing ? 'Applying…' : 'Apply & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
