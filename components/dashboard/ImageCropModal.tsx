'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

interface Props {
  imageSrc: string
  fileName: string
  fileType: string
  aspect?: number
  progressLabel?: string
  onCancel: () => void
  onConfirm: (croppedFile: File) => void
}

function drawCroppedHighQuality(
  image: HTMLImageElement,
  cropPixels: Area,
  outWidth: number,
  outHeight: number,
): HTMLCanvasElement {
  let curW = Math.max(1, Math.round(cropPixels.width))
  let curH = Math.max(1, Math.round(cropPixels.height))
  let source: HTMLCanvasElement = document.createElement('canvas')
  source.width = curW
  source.height = curH
  const sourceCtx = source.getContext('2d')
  if (!sourceCtx) throw new Error('Canvas not supported')
  sourceCtx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    curW,
    curH,
  )

  while (curW / 2 > outWidth && curH / 2 > outHeight) {
    const nextW = Math.round(curW / 2)
    const nextH = Math.round(curH / 2)
    const step = document.createElement('canvas')
    step.width = nextW
    step.height = nextH
    const stepCtx = step.getContext('2d')
    if (!stepCtx) break
    stepCtx.imageSmoothingEnabled = true
    stepCtx.imageSmoothingQuality = 'high'
    stepCtx.drawImage(source, 0, 0, nextW, nextH)
    source = step
    curW = nextW
    curH = nextH
  }

  const final = document.createElement('canvas')
  final.width = outWidth
  final.height = outHeight
  const finalCtx = final.getContext('2d')
  if (!finalCtx) throw new Error('Canvas not supported')
  finalCtx.imageSmoothingEnabled = true
  finalCtx.imageSmoothingQuality = 'high'
  finalCtx.drawImage(source, 0, 0, curW, curH, 0, 0, outWidth, outHeight)
  return final
}

let cachedImage: { src: string; el: HTMLImageElement } | null = null
async function loadImage(imageSrc: string): Promise<HTMLImageElement> {
  if (cachedImage && cachedImage.src === imageSrc) return cachedImage.el
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = imageSrc
  })
  cachedImage = { src: imageSrc, el: img }
  return img
}

async function getCroppedFile(
  imageSrc: string,
  cropPixels: Area,
  fileName: string,
  fileType: string,
  outputType: string,
  quality: number,
  maxDimension: number,
): Promise<File> {
  const image = await loadImage(imageSrc)

  const scale = Math.min(
    1,
    maxDimension / Math.max(cropPixels.width, cropPixels.height),
  )
  const outWidth = Math.max(1, Math.round(cropPixels.width * scale))
  const outHeight = Math.max(1, Math.round(cropPixels.height * scale))

  const canvas = drawCroppedHighQuality(image, cropPixels, outWidth, outHeight)

  const mime = outputType || fileType || 'image/jpeg'
  const q = mime === 'image/png' ? undefined : quality
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop failed'))),
      mime,
      q,
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

const QUALITY_FLOOR = 0.85
const QUALITY_CEIL = 0.97

async function fitToTargetSize(
  imageSrc: string,
  cropPixels: Area,
  fileName: string,
  fileType: string,
  outputType: string,
  startMaxDimension: number,
  targetBytes: number,
): Promise<{
  quality: number
  maxDimension: number
  size: number
  resolutionReduced: boolean
}> {
  const isLossless = outputType === 'image/png'

  const tryQuality = async (q: number, dim: number) => {
    const file = await getCroppedFile(
      imageSrc,
      cropPixels,
      fileName,
      fileType,
      outputType,
      q,
      dim,
    )
    return file.size
  }

  if (isLossless) {
    let dim = startMaxDimension
    let size = await tryQuality(1, dim)
    let guard = 0
    while (size > targetBytes && dim > 200 && guard < 20) {
      dim = Math.round(dim * 0.9)
      size = await tryQuality(1, dim)
      guard++
    }
    return {
      quality: 1,
      maxDimension: dim,
      size,
      resolutionReduced: dim < startMaxDimension,
    }
  }

  const searchQualityAt = async (dim: number) => {
    const floorSize = await tryQuality(QUALITY_FLOOR, dim)
    if (floorSize > targetBytes) return null
    let lo = QUALITY_FLOOR
    let hi = QUALITY_CEIL
    let bestQ = lo
    let bestSize = floorSize
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2
      const size = await tryQuality(mid, dim)
      if (size <= targetBytes) {
        bestQ = mid
        bestSize = size
        lo = mid
      } else {
        hi = mid
      }
    }
    return { quality: bestQ, size: bestSize }
  }

  let dim = startMaxDimension
  let result = await searchQualityAt(dim)
  let guard = 0
  while (!result && dim > 300 && guard < 15) {
    dim = Math.round(dim * 0.9)
    result = await searchQualityAt(dim)
    guard++
  }

  if (!result) {
    const size = await tryQuality(QUALITY_FLOOR, dim)
    result = { quality: QUALITY_FLOOR, size }
  }

  return {
    quality: result.quality,
    maxDimension: dim,
    size: result.size,
    resolutionReduced: dim < startMaxDimension,
  }
}

const ASPECT_PRESETS: { label: string; value?: number }[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
]

const FORMAT_OPTIONS: {
  label: string
  value: 'original' | 'webp' | 'jpeg' | 'png'
}[] = [
  { label: 'Keep original', value: 'original' },
  { label: 'WebP', value: 'webp' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG (lossless)', value: 'png' },
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function ImageCropModal({
  imageSrc,
  fileName,
  fileType,
  aspect: initialAspect,
  progressLabel,
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(initialAspect)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [format, setFormat] = useState<'original' | 'webp' | 'jpeg' | 'png'>(
    'original',
  )
  const [qualityPct, setQualityPct] = useState(92)
  const [keepFullRes, setKeepFullRes] = useState(true)
  const [maxDimension, setMaxDimension] = useState(2000)
  const [previewSize, setPreviewSize] = useState<number | null>(null)
  const previewSeq = useRef(0)

  const [sizeMode, setSizeMode] = useState<'quality' | 'target'>('quality')
  const [targetSizeKB, setTargetSizeKB] = useState(500)
  const [fittingTarget, setFittingTarget] = useState(false)
  const [targetResult, setTargetResult] = useState<{
    quality: number
    maxDimension: number
    size: number
    resolutionReduced: boolean
  } | null>(null)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
    setTargetResult(null)
  }, [])

  const outputType = useMemo(() => {
    if (format === 'original') return fileType || 'image/jpeg'
    return `image/${format}`
  }, [format, fileType])

  const isLossless = outputType === 'image/png'

  useEffect(() => {
    if (isLossless && sizeMode === 'target') setSizeMode('quality')
  }, [isLossless, sizeMode])

  const effectiveMaxDimension = keepFullRes
    ? Math.max(
        croppedAreaPixels?.width ?? 0,
        croppedAreaPixels?.height ?? 0,
        100000,
      )
    : maxDimension

  const activeQuality =
    sizeMode === 'target' && targetResult
      ? targetResult.quality * 100
      : qualityPct
  const activeMaxDimension =
    sizeMode === 'target' && targetResult
      ? targetResult.maxDimension
      : effectiveMaxDimension

  useEffect(() => {
    if (sizeMode !== 'quality') return
    if (!croppedAreaPixels) return
    const seq = ++previewSeq.current
    const timer = setTimeout(async () => {
      try {
        const file = await getCroppedFile(
          imageSrc,
          croppedAreaPixels,
          fileName,
          fileType,
          outputType,
          qualityPct / 100,
          effectiveMaxDimension,
        )
        if (seq === previewSeq.current) setPreviewSize(file.size)
      } catch {
        if (seq === previewSeq.current) setPreviewSize(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [
    sizeMode,
    croppedAreaPixels,
    outputType,
    qualityPct,
    effectiveMaxDimension,
    imageSrc,
    fileName,
    fileType,
  ])

  const runFitToTarget = async () => {
    if (!croppedAreaPixels) return
    setFittingTarget(true)
    try {
      const startDim = keepFullRes
        ? Math.max(croppedAreaPixels.width, croppedAreaPixels.height)
        : maxDimension
      const result = await fitToTargetSize(
        imageSrc,
        croppedAreaPixels,
        fileName,
        fileType,
        outputType,
        startDim,
        targetSizeKB * 1024,
      )
      setTargetResult(result)
    } finally {
      setFittingTarget(false)
    }
  }

  useEffect(() => {
    if (sizeMode !== 'target') return
    if (!croppedAreaPixels) return
    const timer = setTimeout(() => {
      runFitToTarget()
    }, 300)
    return () => clearTimeout(timer)
  }, [sizeMode, croppedAreaPixels, outputType, targetSizeKB])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const file = await getCroppedFile(
        imageSrc,
        croppedAreaPixels,
        fileName,
        fileType,
        outputType,
        activeQuality / 100,
        activeMaxDimension,
      )
      onConfirm(file)
    } finally {
      setProcessing(false)
    }
  }

  const displaySize =
    sizeMode === 'target' ? (targetResult?.size ?? null) : previewSize

  return (
    <div className='fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4'>
      <div className='bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col'>
        <div className='px-5 py-4 border-b border-[#E1E3E5] flex items-center justify-between shrink-0'>
          <h3 className='font-sora text-[15px] font-semibold text-[#202223]'>
            Resize / Crop Image
            {progressLabel && (
              <span className='ml-2 text-[12px] font-normal text-[#8C9196]'>
                ({progressLabel})
              </span>
            )}
          </h3>
          <button
            type='button'
            onClick={onCancel}
            className='text-[#8C9196] hover:text-[#202223] text-lg leading-none cursor-pointer border-none bg-transparent'
          >
            ✕
          </button>
        </div>

        <div className='flex flex-col md:flex-row flex-1 min-h-0'>
          <div className='relative w-full md:w-1/2 h-72 md:h-auto bg-[#1a1a1a] shrink-0'>
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

          <div className='w-full md:w-1/2 px-5 py-4 space-y-4 overflow-y-auto'>
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

            <div>
              <p className='text-[11px] font-medium text-[#6D7175] mb-1.5 uppercase tracking-wide'>
                Output Format
              </p>
              <div className='flex flex-wrap gap-2'>
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => setFormat(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors ${format === opt.value ? 'bg-[#008060] text-white border-[#008060]' : 'bg-white text-[#202223] border-[#E1E3E5] hover:border-[#8C9196]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className='border border-[#E1E3E5] rounded-lg p-3'>
              <p className='text-[11px] font-medium text-[#6D7175] mb-2 uppercase tracking-wide'>
                Size Control
              </p>
              <div className='flex gap-2 mb-3'>
                <button
                  type='button'
                  onClick={() => setSizeMode('quality')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors ${sizeMode === 'quality' ? 'bg-[#008060] text-white border-[#008060]' : 'bg-white text-[#202223] border-[#E1E3E5] hover:border-[#8C9196]'}`}
                >
                  By quality
                </button>
                <button
                  type='button'
                  onClick={() => setSizeMode('target')}
                  disabled={isLossless}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeMode === 'target' ? 'bg-[#008060] text-white border-[#008060]' : 'bg-white text-[#202223] border-[#E1E3E5] hover:border-[#8C9196]'}`}
                >
                  By expected size
                </button>
              </div>

              {sizeMode === 'quality' ? (
                !isLossless && (
                  <div>
                    <div className='flex items-center justify-between mb-1.5'>
                      <p className='text-[11px] font-medium text-[#6D7175] uppercase tracking-wide'>
                        Quality
                      </p>
                      <span className='text-[11px] text-[#6D7175]'>
                        {qualityPct}%
                      </span>
                    </div>
                    <input
                      type='range'
                      min={50}
                      max={100}
                      step={1}
                      value={qualityPct}
                      onChange={(e) => setQualityPct(Number(e.target.value))}
                      className='w-full accent-[#008060]'
                    />
                    <p className='text-[11px] text-[#8C9196] mt-1'>
                      92%+ is visually lossless for photos. Lower only if you
                      need a smaller file.
                    </p>
                  </div>
                )
              ) : (
                <div>
                  <div className='flex items-center gap-2'>
                    <input
                      type='number'
                      min={10}
                      max={20000}
                      step={10}
                      value={targetSizeKB}
                      onChange={(e) =>
                        setTargetSizeKB(
                          Math.max(10, Math.min(20000, Number(e.target.value))),
                        )
                      }
                      className='w-24 px-2 py-1.5 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]'
                    />
                    <span className='text-[12px] text-[#6D7175]'>
                      KB expected size
                    </span>
                  </div>
                  <p className='text-[11px] text-[#8C9196] mt-1.5'>
                    Quality is kept at 85%+ to avoid visible artifacts;
                    resolution is reduced gradually instead if that's not enough
                    to hit the target.
                  </p>
                  {targetResult && (
                    <p className='text-[11px] text-[#202223] mt-1.5'>
                      Using {Math.round(targetResult.quality * 100)}% quality
                      {targetResult.resolutionReduced
                        ? `, resized to fit within ${targetResult.maxDimension}px`
                        : ''}
                      .
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className='flex items-center gap-2 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  checked={keepFullRes}
                  onChange={(e) => setKeepFullRes(e.target.checked)}
                  disabled={sizeMode === 'target'}
                  className='w-4 h-4 accent-[#008060] cursor-pointer disabled:opacity-50'
                />
                <span className='text-[12.5px] text-[#202223]'>
                  Keep full resolution
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    (no downscaling, only crop/format applied)
                  </span>
                </span>
              </label>
              {!keepFullRes && sizeMode === 'quality' && (
                <div className='mt-2 flex items-center gap-2'>
                  <input
                    type='number'
                    min={200}
                    max={6000}
                    step={100}
                    value={maxDimension}
                    onChange={(e) =>
                      setMaxDimension(
                        Math.max(200, Math.min(6000, Number(e.target.value))),
                      )
                    }
                    className='w-24 px-2 py-1.5 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]'
                  />
                  <span className='text-[12px] text-[#6D7175]'>
                    px max side length
                  </span>
                </div>
              )}
            </div>

            <div className='flex items-center justify-between text-[12px] bg-[#F6F6F7] rounded-lg px-3 py-2'>
              <span className='text-[#6D7175]'>Estimated output size</span>
              <span className='font-medium text-[#202223]'>
                {fittingTarget
                  ? 'Calculating…'
                  : displaySize == null
                    ? 'Calculating…'
                    : formatBytes(displaySize)}
              </span>
            </div>
          </div>
        </div>

        <div className='px-5 py-4 border-t border-[#E1E3E5] flex items-center justify-end gap-2.5 shrink-0'>
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
            disabled={processing || !croppedAreaPixels || fittingTarget}
            className='px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-[#008060] hover:bg-[#006e52] disabled:opacity-60 cursor-pointer'
          >
            {processing ? 'Applying…' : 'Apply & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
