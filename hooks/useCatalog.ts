import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  catalogQueryToParams,
  emptyFacets,
  type CatalogQuery,
  type CatalogResponse,
} from '@/lib/catalog/types'

async function fetchCatalog(query: CatalogQuery): Promise<CatalogResponse> {
  const res = await fetch(
    `/api/store/catalog?${catalogQueryToParams(query).toString()}`,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * One request per filter/sort/page combination, instead of downloading the
 * whole catalogue and recomputing everything locally on each change.
 *
 * `placeholderData: keepPreviousData` matters for feel here: paging or toggling
 * a filter keeps the previous grid on screen while the next response lands,
 * rather than flashing the skeleton. The old progressive loader produced the
 * opposite — "0 products found" first, then results trickling in as batches
 * arrived.
 */
export function useCatalog(
  query: CatalogQuery,
  /**
   * Page 1 pre-loaded by the server for the query identified by `key`. It is
   * only applied when the live query matches that key, so changing a filter,
   * sort or page still fetches normally.
   */
  initial?: { key: string; data: CatalogResponse },
) {
  const key = catalogQueryToParams(query).toString()
  const useInitial = !!initial && initial.key === key
  const result = useQuery({
    queryKey: ['catalog', key],
    queryFn: () => fetchCatalog(query),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
    initialData: useInitial ? initial!.data : undefined,
  })
  return {
    products: result.data?.products ?? [],
    count: result.data?.count ?? 0,
    facets: result.data?.facets ?? emptyFacets(),
    // isLoading is true only on the very first load for a given key set;
    // subsequent filter changes surface as isFetching so the grid can stay up.
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
  }
}
