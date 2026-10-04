'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  STRINGING_SPORTS,
  STRINGING_SPORT_LABEL,
  STRING_TYPES,
  detectStringingSport,
  isStringingCategoryHandle,
  looksLikeStringing,
  sportFromStringingHandle,
  stringingCategoryHandle,
  stringingKind,
  type StringingKind,
  type StringingSport,
} from '@/lib/stringing'

interface Cat {
  id: string
  name: string
  handle: string
  label: string
}

interface Props {
  /** Product name being typed. */
  title: string
  /** The form's Sport field. */
  sport: string
  categories: Cat[]
  categoryId: string
  stringingType: StringingKind
  stringType?: string
  onChangeStringType?: (v: string) => void
  onSelectCategory: (id: string) => void
  onChangeSport: (sport: string) => void
  onChangeType: (t: StringingKind) => void
}

const box = 'rounded-lg border px-3.5 py-3 text-[12.5px] leading-relaxed'
const btn =
  'mt-2 mr-2 px-3 py-1.5 rounded-md border border-[#008060] text-[#008060] bg-white text-[12px] font-medium cursor-pointer hover:bg-[#008060]/5'

/**
 * Sits under the Category dropdown on the Add / Edit product pages.
 *   - Detects the sport from the product NAME (then its Sport field) and, if no
 *     category is chosen yet, files a stringing product under
 *     "<Sport> › Stringing" automatically.
 *   - Says plainly where the product will show on the website.
 *   - Warns when the category and the name / Sport field disagree.
 */
export default function StringingCategoryHint({
  title,
  sport,
  categories,
  categoryId,
  stringingType,
  stringType = '',
  onChangeStringType,
  onSelectCategory,
  onChangeSport,
  onChangeType,
}: Props) {
  // Owner-added string types (saved in store settings). The built-in ones
  // come from STRING_TYPES; custom ones are stored and saved on the product
  // as their label text.
  const ADD_NEW = '__add_new__'
  const [customTypes, setCustomTypes] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/string-types', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d?.custom)) setCustomTypes(d.custom)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const saveType = async (action: 'add' | 'remove', label: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/string-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, label }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save string type')
      setCustomTypes(data.custom ?? [])
      return data as { custom: string[]; added?: string }
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save string type')
      return null
    } finally {
      setBusy(false)
    }
  }
  const addType = async () => {
    const label = newName.trim()
    if (!label) return
    const data = await saveType('add', label)
    if (!data?.added) return
    onChangeStringType?.(data.added)
    setNewName('')
    setAdding(false)
    toast.success(`“${data.added}” added to string types`)
  }
  const removeType = async (label: string) => {
    if (
      !window.confirm(
        `Remove “${label}” from the list? Products already using it keep it.`,
      )
    )
      return
    const data = await saveType('remove', label)
    if (data) {
      onChangeStringType?.('')
      toast.success(`“${label}” removed`)
    }
  }
  const isCustomSelected = customTypes.some(
    (c) => c.toLowerCase() === stringType.toLowerCase(),
  )

  const selected = categories.find((c) => c.id === categoryId)
  const isStringingCat =
    !!selected && isStringingCategoryHandle(selected.handle)
  const catSport = sportFromStringingHandle(selected?.handle)
  // Evidence from the product itself (name, Sport field) — deliberately NOT the
  // category, so we can tell when the category is wrong.
  const detected = detectStringingSport({ title, sport })
  const stringy = looksLikeStringing(title)

  const catFor = (s: StringingSport) =>
    categories.find((c) => c.handle === stringingCategoryHandle(s))
  const moveTo = (s: StringingSport) => {
    const c = catFor(s)
    if (c) onSelectCategory(c.id)
    onChangeSport(s)
  }

  // Empty category + a stringing-looking name + a detectable sport -> pick the
  // right "<Sport> › Stringing" category for the owner. Once only, so it never
  // fights a later manual choice.
  const autoDone = useRef(false)
  useEffect(() => {
    if (autoDone.current || categoryId || !stringy || !detected) return
    const c = catFor(detected)
    if (!c) return
    autoDone.current = true
    onSelectCategory(c.id)
    if (!sport) onChangeSport(detected)
    onChangeType(stringingKind(title))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, stringy, detected, categories])

  // A sport-specific stringing category with no Sport field yet: take it.
  useEffect(() => {
    if (catSport && !sport) onChangeSport(catSport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catSport, sport])

  if (!isStringingCat) {
    if (stringy && detected && catFor(detected)) {
      return (
        <div className={`${box} border-[#B4E1D3] bg-[#F1F8F5] text-[#0D4D3A]`}>
          This looks like a <b>{STRINGING_SPORT_LABEL[detected]}</b> stringing
          product.
          <div>
            <button
              type='button'
              className={btn}
              onClick={() => moveTo(detected)}
            >
              File it under {STRINGING_SPORT_LABEL[detected]} › Stringing
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  const effective: StringingSport | null = detected ?? catSport
  const mismatch = !!detected && !!catSport && detected !== catSport

  return (
    <div className='space-y-2.5'>
      <div>
        <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
          Stringing type
        </label>
        <select
          value={stringingType}
          onChange={(e) => onChangeType(e.target.value as StringingKind)}
          className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white cursor-pointer'
        >
          <option value='service'>
            Service — offered as an add-on on racket pages
          </option>
          <option value='reel'>Reel — string sold on its own</option>
        </select>
      </div>

      {stringingType === 'service' && onChangeStringType && (
        <div>
          <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
            String type (heading in the dropdown)
          </label>
          <select
            value={adding ? ADD_NEW : stringType}
            onChange={(e) => {
              if (e.target.value === ADD_NEW) {
                setAdding(true)
                return
              }
              setAdding(false)
              onChangeStringType(e.target.value)
            }}
            className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white cursor-pointer'
          >
            <option value=''>Not set (shown under “Other”)</option>
            {STRING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
            {customTypes.map((c) => (
              <option key={`custom-${c}`} value={c}>
                {c}
              </option>
            ))}
            {stringType &&
              !STRING_TYPES.some((t) => t.value === stringType) &&
              !customTypes.some(
                (c) => c.toLowerCase() === stringType.toLowerCase(),
              ) && <option value={stringType}>{stringType}</option>}
            <option value={ADD_NEW}>＋ Add new string type…</option>
          </select>
          {adding && (
            <div className='mt-2 flex items-center gap-2'>
              <input
                autoFocus
                type='text'
                value={newName}
                maxLength={40}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void addType()
                  }
                  if (e.key === 'Escape') {
                    setAdding(false)
                    setNewName('')
                  }
                }}
                placeholder='e.g. Textured Polyester'
                className='flex-1 px-3.5 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white'
              />
              <button
                type='button'
                onClick={() => void addType()}
                disabled={busy || !newName.trim()}
                className='px-3.5 py-2 rounded-lg bg-[#008060] hover:bg-[#006e52] text-white text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-50'
              >
                {busy ? 'Adding…' : 'Add'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setAdding(false)
                  setNewName('')
                }}
                className='px-3 py-2 rounded-lg border border-[#E1E3E5] bg-white text-[12.5px] text-[#202223] cursor-pointer hover:bg-[#F6F6F7]'
              >
                Cancel
              </button>
            </div>
          )}
          {isCustomSelected && !adding && (
            <button
              type='button'
              onClick={() => void removeType(stringType)}
              disabled={busy}
              className='mt-1.5 text-[11.5px] text-[#D72C0D] bg-transparent border-none p-0 cursor-pointer underline disabled:opacity-50'
            >
              Remove “{stringType}” from the list
            </button>
          )}
          <p className='mt-1 text-[11.5px] text-[#8C9196]'>
            Racket pages group the String Selection dropdown by this, e.g. all
            Polyester services under one “Polyester” heading.
          </p>
        </div>
      )}

      {stringingType === 'reel' ? (
        <div className={`${box} border-[#E1E3E5] bg-[#F6F6F7] text-[#4A4F55]`}>
          Sold as a normal product. It will <b>not</b> appear in the stringing
          dropdown on racket pages.
        </div>
      ) : effective ? (
        <div className={`${box} border-[#B4E1D3] bg-[#F1F8F5] text-[#0D4D3A]`}>
          Shows in the <b>String Selection</b> dropdown on{' '}
          <b>{STRINGING_SPORT_LABEL[effective]}</b> racket pages. Whether it is
          free or paid is set on each racket (Offer String Upgrade). It also
          needs a price, and stock above 0 if Track inventory is on.
        </div>
      ) : (
        <div className={`${box} border-[#FFD79D] bg-[#FFF5EA] text-[#8A6116]`}>
          Can't tell which sport this is for, so it won't show on any racket.
          Which sport?
          <div>
            {STRINGING_SPORTS.map((s) => (
              <button
                key={s}
                type='button'
                className={btn}
                onClick={() => moveTo(s)}
              >
                {STRINGING_SPORT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {mismatch && detected && (
        <div className={`${box} border-[#FFD79D] bg-[#FFF5EA] text-[#8A6116]`}>
          The name / Sport field says <b>{STRINGING_SPORT_LABEL[detected]}</b>,
          but it is filed under{' '}
          <b>{selected?.label ?? STRINGING_SPORT_LABEL[catSport!]}</b>. It will
          show on {STRINGING_SPORT_LABEL[detected]} rackets.
          {catFor(detected) && (
            <div>
              <button
                type='button'
                className={btn}
                onClick={() => moveTo(detected)}
              >
                Move to {STRINGING_SPORT_LABEL[detected]} › Stringing
              </button>
            </div>
          )}
        </div>
      )}

      {!catSport && (
        <div className={`${box} border-[#FFD79D] bg-[#FFF5EA] text-[#8A6116]`}>
          <b>{selected?.label}</b> isn't tied to a sport. File it under one:
          <div>
            {STRINGING_SPORTS.filter((s) => catFor(s)).map((s) => (
              <button
                key={s}
                type='button'
                className={btn}
                onClick={() => moveTo(s)}
              >
                {STRINGING_SPORT_LABEL[s]} › Stringing
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
