import { Node, mergeAttributes } from '@tiptap/core'
import { DOMOutputSpec, DOMSerializer } from '@tiptap/pm/model'

export interface ProductGridOptions {
  HTMLAttributes: Record<string, any>
}

export interface ProductGridItem {
  productId: string
  handle: string
  title: string
  thumbnail: string | null
  price: string | null
}

export interface ProductGridAttrs {
  products: ProductGridItem[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    productGrid: {
      setProductGrid: (options: ProductGridAttrs) => ReturnType
    }
  }
}

// Builds the same DOM spec used by renderHTML, as a standalone function so
// it can be called both from renderHTML (via `this`) and from addNodeView
// below (where `this` is Tiptap's internal extension-field context, not the
// node config, so `this.renderHTML` is NOT available there).
function buildProductGridSpec(
  attrs: ProductGridAttrs,
  baseHTMLAttributes: Record<string, any>,
  extraHTMLAttributes: Record<string, any> = {},
): DOMOutputSpec {
  const items = Array.isArray(attrs.products) ? attrs.products : []
  const children: any[] = items.map((product) => {
    const href = product.handle ? `/shop/${product.handle}` : '#'
    return [
      'div',
      {
        class: 'product-grid-item',
        'data-product-id': product.productId ?? '',
        'data-handle': product.handle ?? '',
        'data-title': product.title ?? '',
        'data-price': product.price ?? '',
      },
      [
        'a',
        { href, class: 'product-grid-link' },
        ...(product.thumbnail
          ? [
              [
                'img',
                {
                  src: product.thumbnail,
                  alt: product.title || '',
                  class: 'product-grid-image',
                },
              ],
            ]
          : []),
        [
          'div',
          { class: 'product-grid-info' },
          [
            'p',
            { class: 'product-grid-title' },
            product.title || 'View product',
          ],
          ...(product.price
            ? [['p', { class: 'product-grid-price' }, product.price]]
            : []),
        ],
      ],
      [
        'button',
        { type: 'button', class: 'product-grid-add-btn' },
        'Add to Cart',
      ],
    ]
  })
  return [
    'div',
    mergeAttributes(baseHTMLAttributes, extraHTMLAttributes, {
      'data-count': String(items.length),
    }),
    ...children,
  ] as DOMOutputSpec
}

// If any grid item is missing a handle (saved before the route.ts fix),
// fetch the real handles from the admin API and patch the node attrs + DOM
// in place so the editor shows correct cards immediately — no script needed.
async function hydrateGridHandles(
  products: ProductGridItem[],
  editor: any,
  getPos: () => number | undefined,
  outerDom: HTMLElement,
): Promise<void> {
  const missing = products.filter((p) => !p.handle && p.productId)
  if (!missing.length) return

  try {
    // Fetch all missing products in one call using id[] params
    const params = new URLSearchParams({ limit: String(missing.length) })
    missing.forEach((p) => params.append('id[]', p.productId))
    // Fallback: admin products list doesn't support id[] filtering directly,
    // so fetch each missing product individually (usually just 1-4 items)
    const handleById = new Map<string, string>()
    await Promise.all(
      missing.map(async (p) => {
        try {
          const res = await fetch(
            `/api/admin/products?limit=1&q=${encodeURIComponent(p.productId)}`,
          )
          if (!res.ok) return
          const data = await res.json()
          const found =
            (data.products ?? []).find((pr: any) => pr.id === p.productId) ??
            data.products?.[0]
          if (found?.handle) handleById.set(p.productId, found.handle)
        } catch {
          /* ignore */
        }
      }),
    )

    if (!handleById.size) return

    // Patch DOM in place
    outerDom
      .querySelectorAll<HTMLElement>('.product-grid-item')
      .forEach((itemEl) => {
        const pid = itemEl.getAttribute('data-product-id') || ''
        const realHandle = handleById.get(pid)
        if (!realHandle) return
        itemEl.setAttribute('data-handle', realHandle)
        const link = itemEl.querySelector<HTMLAnchorElement>(
          'a.product-grid-link',
        )
        if (link) link.href = `/shop/${realHandle}`
      })

    // Patch node attrs so next Save writes correct handles into the HTML
    if (typeof getPos === 'function') {
      const pos = getPos()
      if (typeof pos === 'number') {
        const patchedProducts = products.map((p) => ({
          ...p,
          handle: handleById.get(p.productId) ?? p.handle,
        }))
        editor.commands.command(({ tr }: any) => {
          tr.setNodeAttribute(pos, 'products', patchedProducts)
          return true
        })
      }
    }
  } catch {
    /* non-fatal */
  }
}

// Renders a row/grid of "shop the product" cards inside blog content (2-4
// products side by side). Each card/link is a static snapshot (title/price/
// thumbnail at insert time), same as the single ProductCardNode. Clicking
// the card links straight through to the product page, and the "Add to
// Cart" button is hydrated client-side by BlogProductEmbedHydrator (see
// app/(website)/blog/[slug]/page.tsx) so it behaves like the real shop cards.
export const ProductGridNode = Node.create<ProductGridOptions>({
  name: 'productGrid',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'product-grid-embed',
      },
    }
  },

  addAttributes() {
    return {
      products: {
        default: [] as ProductGridItem[],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.product-grid-embed',
        getAttrs: (el) => {
          const node = el as HTMLElement
          const items = Array.from(
            node.querySelectorAll('.product-grid-item'),
          ).map((item) => {
            const wrap = item as HTMLElement
            return {
              productId: wrap.getAttribute('data-product-id') || '',
              handle: wrap.getAttribute('data-handle') || '',
              title:
                wrap.getAttribute('data-title') ||
                wrap
                  .querySelector('.product-grid-title')
                  ?.textContent?.trim() ||
                '',
              thumbnail: wrap.querySelector('img')?.getAttribute('src') || null,
              price:
                wrap.getAttribute('data-price') ||
                wrap
                  .querySelector('.product-grid-price')
                  ?.textContent?.trim() ||
                null,
            }
          })
          return { products: items }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return buildProductGridSpec(
      node.attrs as ProductGridAttrs,
      this.options.HTMLAttributes,
      HTMLAttributes,
    )
  },

  addCommands() {
    return {
      setProductGrid:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    }
  },

  // Editor-only UI: same idea as ProductCardNode — a remove button so an
  // admin can delete the whole inserted grid in one click. Never affects
  // saved/public content since editor.getHTML() serializes via renderHTML.
  //
  // Auto-heal: any grid item with an empty handle gets its real handle
  // fetched from the admin API and patched into both the DOM and node attrs,
  // so the next Save persists the fix without any manual script.
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const attrs = node.attrs as ProductGridAttrs
      const outer = document.createElement('div')
      outer.className = 'product-grid-wrapper'
      outer.contentEditable = 'false'

      const { dom } = DOMSerializer.renderSpec(
        document,
        buildProductGridSpec(attrs, {
          class: 'product-grid-embed',
        }),
      )
      outer.appendChild(dom)

      // Auto-heal: fetch missing handles for any broken grid items
      const hasMissing = (attrs.products ?? []).some(
        (p) => !p.handle && p.productId,
      )
      if (hasMissing) {
        hydrateGridHandles(
          attrs.products ?? [],
          editor,
          getPos as () => number | undefined,
          dom as HTMLElement,
        )
      }

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'product-grid-remove-btn'
      removeBtn.setAttribute('aria-label', 'Remove product grid')
      removeBtn.title = 'Remove product grid'
      removeBtn.textContent = '\u00d7'
      removeBtn.addEventListener('mousedown', (e) => e.preventDefault())
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run()
      })
      outer.appendChild(removeBtn)

      return { dom: outer }
    }
  },
})

export default ProductGridNode
