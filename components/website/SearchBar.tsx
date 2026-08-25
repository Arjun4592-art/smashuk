'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { normalizeProduct } from '@/lib/api/store';
import { SearchIcon, CloseIcon, ArrowRightIcon, TagIcon } from '@/components/ui/Icons';
import { SPORTS } from '@/lib/constants';
import Link from 'next/link';
interface SearchBarProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}
const POPULAR_SEARCHES = ['Yonex Racket', 'Babolat Tennis', 'Badminton Shoes', 'Padel Racket', 'Victor Bag', 'Li-Ning'];
export default function SearchBar({
  placeholder = 'Search products, brands, sports...',
  className = '',
  autoFocus = false
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sp_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 4));
    } catch {}
  }, []);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const {
          medusaStore
        } = await import('@/lib/medusa');
        const region = await medusaStore.store.region.list().then((r: any) => r.regions[0]);
        const {
          products
        }: {
          products: any[];
        } = await medusaStore.store.product.list({
          q: query.trim(),
          limit: 6,
          region_id: region?.id,
          fields: '+variants.calculated_price'
        });
        setResults(products.map(normalizeProduct).filter(p => p.inStock));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setSelectedIndex(-1);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const saveRecentSearch = useCallback((term: string) => {
    try {
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 4);
      setRecentSearches(updated);
      localStorage.setItem('sp_recent_searches', JSON.stringify(updated));
    } catch {}
  }, [recentSearches]);
  const handleSearch = useCallback((term?: string) => {
    const q = (term ?? query).trim();
    if (!q) return;
    saveRecentSearch(q);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
    setFocused(false);
    setQuery('');
  }, [query, router, saveRecentSearch]);
  const clearRecent = (e: React.MouseEvent, term: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem('sp_recent_searches', JSON.stringify(updated));
    } catch {}
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focused) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        const p = results[selectedIndex];
        saveRecentSearch(p.name);
        router.push(`/shop/${p.slug}`);
        setFocused(false);
        setQuery('');
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
      setQuery('');
    }
  };
  const highlight = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return <>
        {text.slice(0, idx)}
        <span className='text-[#E8553A] font-black'>
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>;
  };
  const showDropdown = focused;
  const hasQuery = query.trim().length >= 2;
  return <div ref={containerRef} className={`relative ${className}`}>
      <div className={`flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 transition-all duration-200 ${focused ? 'border-[#E8553A] shadow-[0_0_0_3px_rgba(232,85,58,0.08)]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'}`}>
        {isSearching ? <svg className='w-[18px] h-[18px] text-[#E8553A] animate-spin shrink-0' viewBox='0 0 24 24' fill='none'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' />
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' />
          </svg> : <SearchIcon size={18} className={`shrink-0 transition-colors ${focused ? 'text-[#E8553A]' : 'text-[#9CA3AF]'}`} />}

        <input ref={inputRef} type='text' value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onKeyDown={handleKeyDown} placeholder={placeholder} className='flex-1 outline-none text-sm text-[#0A1F44] placeholder-[#9CA3AF] font-lato bg-transparent' autoComplete='off' spellCheck={false} />

        {query && <button onClick={() => {
        setQuery('');
        inputRef.current?.focus();
      }} className='text-[#9CA3AF] hover:text-[#0A1F44] shrink-0 transition-colors'>
            <CloseIcon size={15} />
          </button>}

        <button onClick={() => handleSearch()} className='bg-[#E8553A] hover:bg-[#D4441F] text-white text-[11px] font-black px-3 py-1.5 rounded-lg transition-colors font-montserrat shrink-0 whitespace-nowrap'>
          Search
        </button>
      </div>

      {showDropdown && <div className='absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] border border-[#E5E7EB] z-50 overflow-hidden'>
          {hasQuery && results.length > 0 && <>
              <div className='px-4 pt-3.5 pb-1 flex items-center justify-between'>
                <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] font-montserrat'>
                  Products
                </p>
                <p className='text-[10px] text-[#9CA3AF] font-lato'>
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
              </div>

              {results.map((product, i) => <Link key={product.id} href={`/shop/${product.slug}`} onClick={() => {
          saveRecentSearch(product.name);
          setFocused(false);
          setQuery('');
        }} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${selectedIndex === i ? 'bg-[#E8553A]/6' : 'hover:bg-[#F2F4F7]'}`}>
                  <div className='w-11 h-11 rounded-xl overflow-hidden bg-[#F2F4F7] border border-[#E5E7EB] shrink-0'>
                    <img src={product.images[0]} alt={product.name} className='w-full h-full object-cover' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-[13px] font-bold text-[#0A1F44] font-montserrat truncate'>
                      {highlight(product.name, query)}
                    </p>
                    <p className='text-[11px] text-[#9CA3AF] font-lato mt-0.5'>
                      <span className='text-[#E8553A] font-semibold'>
                        {highlight(product.brand, query)}
                      </span>
                      {' · '}
                      {product.sport}
                    </p>
                  </div>
                  <div className='text-right shrink-0'>
                    {product.badge && <p className='text-[9px] font-black text-[#E8553A] font-montserrat uppercase tracking-wide mb-0.5'>
                        {product.badge}
                      </p>}
                    <p className='text-[13px] font-black text-[#0A1F44] font-montserrat'>
                      {formatCurrency(product.price)}
                    </p>
                    {product.originalPrice && <p className='text-[10px] text-[#9CA3AF] line-through font-lato'>
                        {formatCurrency(product.originalPrice)}
                      </p>}
                  </div>
                </Link>)}

              <div className='border-t border-[#F2F4F7] px-4 py-3'>
                <button onClick={() => handleSearch()} className='flex items-center gap-1.5 text-[13px] text-[#E8553A] font-bold font-montserrat hover:gap-2.5 transition-all group'>
                  See all results for &quot;{query}&quot;
                  <ArrowRightIcon size={13} className='group-hover:translate-x-1 transition-transform' />
                </button>
              </div>
            </>}

          {hasQuery && results.length === 0 && !isSearching && <div className='px-4 py-8 text-center'>
              <p className='text-3xl mb-3'>🔍</p>
              <p className='font-montserrat font-black text-sm text-[#0A1F44] mb-1'>
                No results for &quot;{query}&quot;
              </p>
              <p className='text-[12px] text-[#9CA3AF] font-lato mb-4'>
                Try a different keyword or browse by sport
              </p>
              <div className='flex flex-wrap gap-1.5 justify-center'>
                {SPORTS.map(sport => <Link key={sport.slug} href={`/shop?sport=${sport.slug}`} onClick={() => setFocused(false)} className='flex items-center gap-1 px-3 py-1.5 bg-[#F2F4F7] hover:bg-[#E8553A]/8 hover:text-[#E8553A] rounded-full text-[12px] text-[#4B5563] transition-colors font-lato border border-transparent hover:border-[#E8553A]/20'>
                    {sport.icon} {sport.label}
                  </Link>)}
              </div>
            </div>}

          {!hasQuery && <div className='p-4 space-y-4'>
              {recentSearches.length > 0 && <div>
                  <div className='flex items-center justify-between mb-2.5'>
                    <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] font-montserrat'>
                      Recent
                    </p>
                    <button onClick={() => {
              setRecentSearches([]);
              try {
                localStorage.removeItem('sp_recent_searches');
              } catch {}
            }} className='text-[10px] text-[#9CA3AF] hover:text-[#E8553A] font-lato transition-colors'>
                      Clear all
                    </button>
                  </div>
                  <div className='space-y-0.5'>
                    {recentSearches.map(term => <div key={term} className='flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#F2F4F7] transition-colors group cursor-pointer' onClick={() => handleSearch(term)}>
                        <SearchIcon size={13} className='text-[#D1D5DB] shrink-0' />
                        <span className='flex-1 text-[13px] text-[#4B5563] font-lato'>
                          {term}
                        </span>
                        <button onClick={e => clearRecent(e, term)} className='opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-[#0A1F44]'>
                          <CloseIcon size={12} />
                        </button>
                      </div>)}
                  </div>
                </div>}

              <div>
                <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] mb-2.5 font-montserrat'>
                  Popular Searches
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {POPULAR_SEARCHES.map(term => <button key={term} onClick={() => handleSearch(term)} className='flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F4F7] hover:bg-[#E8553A]/8 hover:text-[#E8553A] border border-transparent hover:border-[#E8553A]/20 rounded-full text-[12px] text-[#4B5563] transition-all font-lato'>
                      <TagIcon size={11} className='text-[#9CA3AF]' />
                      {term}
                    </button>)}
                </div>
              </div>

              <div className='border-t border-[#F2F4F7] pt-4'>
                <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] mb-2.5 font-montserrat'>
                  Browse by Sport
                </p>
                <div className='grid grid-cols-2 gap-1.5'>
                  {SPORTS.map(sport => <Link key={sport.slug} href={`/shop?sport=${sport.slug}`} onClick={() => setFocused(false)} className='flex items-center gap-2 px-3 py-2 bg-[#F2F4F7] hover:bg-[#E8553A]/8 hover:text-[#E8553A] rounded-xl text-[12px] text-[#0A1F44] font-lato transition-all border border-transparent hover:border-[#E8553A]/20 group'>
                      <span className='text-base group-hover:scale-110 transition-transform inline-block'>
                        {sport.icon}
                      </span>
                      <span className='font-medium'>{sport.label}</span>
                      <ArrowRightIcon size={11} className='ml-auto text-[#D1D5DB] group-hover:text-[#E8553A] group-hover:translate-x-0.5 transition-all' />
                    </Link>)}
                </div>
              </div>
            </div>}

          {hasQuery && results.length > 0 && <div className='border-t border-[#F2F4F7] px-4 py-2 flex items-center gap-4'>
              {[['↑↓', 'navigate'], ['↵', 'select'], ['Esc', 'close']].map(([key, label]) => <span key={key} className='text-[10px] text-[#9CA3AF] font-lato flex items-center gap-1'>
                  <kbd className='px-1.5 py-0.5 bg-[#F2F4F7] rounded text-[9px] font-mono border border-[#E5E7EB]'>
                    {key}
                  </kbd>
                  {label}
                </span>)}
            </div>}
        </div>}
    </div>;
}
