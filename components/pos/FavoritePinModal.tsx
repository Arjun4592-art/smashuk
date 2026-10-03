'use client'

import { useState } from 'react'
import {
  MAX_CUSTOM_TABS,
  type FavoriteTab,
  type FavoriteTabId,
} from '@/lib/pos/favorites'
import NewFavoriteTabInput from '@/components/pos/NewFavoriteTabInput'

interface Props {
  productName: string
  image?: string
  tabs: FavoriteTab[]
  pinnedTabs: Set<FavoriteTabId>
  onToggle: (tab: FavoriteTabId) => void
  /** Creates a new tab and pins this product to it. Should throw on failure. */
  onCreateTab: (label: string) => Promise<void>
  onClose: () => void
}

export default function FavoritePinModal({
  productName,
  image,
  tabs,
  pinnedTabs,
  onToggle,
  onCreateTab,
  onClose,
}: Props) {
  const [adding, setAdding] = useState(false)
  const customCount = tabs.filter((t) => t.custom).length
  const canAddTab = customCount < MAX_CUSTOM_TABS
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-sm rounded-xl overflow-hidden flex flex-col'
        style={{ background: '#FFFFFF', maxHeight: '80vh' }}
      >
        <div
          className='flex items-center gap-3 p-4 border-b'
          style={{ borderColor: '#E1E3E5' }}
        >
          {image && (
            <img
              src={image}
              alt={productName}
              className='w-10 h-10 rounded-md object-cover shrink-0'
              style={{ background: '#F6F6F7' }}
            />
          )}
          <div className='min-w-0 flex-1'>
            <p
              className='text-sm font-semibold leading-tight line-clamp-2'
              style={{ color: '#202223' }}
            >
              {productName}
            </p>
            <p className='text-xs' style={{ color: '#8C9196' }}>
              Show in Favorites tab
            </p>
          </div>
          <button
            onClick={onClose}
            className='shrink-0 w-7 h-7 flex items-center justify-center rounded-full'
            style={{ color: '#6D7175' }}
            aria-label='Close'
          >
            ✕
          </button>
        </div>

        <div className='overflow-y-auto p-2'>
          {tabs.map((tab) => {
            const on = pinnedTabs.has(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => onToggle(tab.id)}
                className='w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-left text-sm'
                style={{ color: '#202223' }}
              >
                <span>{tab.label}</span>
                <span
                  className='w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0'
                  style={{
                    background: on ? '#008060' : '#FFFFFF',
                    border: `1px solid ${on ? '#008060' : '#C9CCCF'}`,
                    color: '#FFFFFF',
                  }}
                >
                  {on ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>

        <div className='px-5 py-3 border-t' style={{ borderColor: '#E1E3E5' }}>
          {adding ? (
            <NewFavoriteTabInput
              onSubmit={async (label) => {
                await onCreateTab(label)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          ) : canAddTab ? (
            <button
              type='button'
              onClick={() => setAdding(true)}
              className='text-sm font-semibold'
              style={{ color: '#008060' }}
            >
              + New tab
            </button>
          ) : (
            <p className='text-xs' style={{ color: '#8C9196' }}>
              Maximum of {MAX_CUSTOM_TABS} custom tabs reached
            </p>
          )}
        </div>
        <div className='p-3 border-t' style={{ borderColor: '#E1E3E5' }}>
          <button
            onClick={onClose}
            className='w-full py-2.5 rounded-lg text-sm font-semibold'
            style={{ background: '#008060', color: '#FFFFFF' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
