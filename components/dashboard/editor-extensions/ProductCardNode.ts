import { Node, mergeAttributes } from '@tiptap/core'
import { DOMOutputSpec, DOMSerializer } from '@tiptap/pm/model'

export interface ProductCardOptions {
  HTMLAttributes: Record<string, any>
}

export interface ProductCardAttrs {
  productId: string
  handle: string
  title: string
  thumbnail: string | null
  price: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    productCard: {
      setProductCard: (options: ProductCardAttrs) => ReturnType
    }
  }
}

// Builds the same DOM spec used by renderHTML, as a standalone function so
// it can be called both from renderHTML (via `this`) and from addNodeView
// below (where `this` is Tiptap's internal extension-field context, not the
// node config, so `this.renderHTML` is NOT available there).
function buildProductCardSpec(
  attrs: ProductCardAttrs,
  baseHTMLAttributes: Record<string, any>,
  extraHTMLAttributes: Record<string, any> = {},
): DOMOutputSpec {
  const { productId, handle, title, thumbnail, price } = attrs
  const href = handle ? `/shop/${handle}` : '#'
  const children: any[] = [
    [
      'a',
      { href, class: 'product-embed-link' },
      [
        'div',
        { class: 'product-embed-image-wrap' },
        ...(thumbnail
          ? [
              [
                'img',
                {
                  src: thumbnail,
                  alt: title || '',
                  class: 'product-embed-image',
                },
              ],
            ]
          : []),
      ],
      [
        'div',
        { class: 'product-embed-info' },
        ['p', { class: 'product-embed-title' }, title || 'View product'],
        ...(price ? [['p', { class: 'product-embed-price' }, price]] : []),
      ],
    ],
    [
      'button',
      { type: 'button', class: 'product-embed-add-btn' },
      'Add to Cart',
    ],
  ]
  return [
    'div',
    mergeAttributes(baseHTMLAttributes, extraHTMLAttributes, {
      'data-product-id': productId ?? '',
      'data-handle': handle ?? '',
      'data-title': title ?? '',
      'data-price': price ?? '',
    }),
    ...children,
  ] as DOMOutputSpec
}

// If the saved embed is missing a handle (saved before the route.ts fix),
// fetch it from the admin API and patch the node attrs + DOM in place so the
// editor shows the correct card immediately — no manual script needed.
async function hydrateHandle(
  productId: string,
  editor: any,
  getPos: () => number | undefined,
  dom: HTMLElement,
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/admin/products?limit=1&q=${encodeURIComponent(productId)}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    // Try exact id match first
    const product =
      (data.products ?? []).find((p: any) => p.id === productId) ??
      data.products?.[0]
    const handle: string | undefined = product?.handle
    if (!handle) return null

    // Patch the DOM immediately so the editor card looks right
    dom.setAttribute('data-handle', handle)
    const link = dom.querySelector<HTMLAnchorElement>('a.product-embed-link')
    if (link) link.href = `/shop/${handle}`

    // Patch the node attrs so renderHTML / getHTML writes the correct handle
    // into the saved HTML on next Save — this fixes it permanently.
    if (typeof getPos === 'function') {
      const pos = getPos()
      if (typeof pos === 'number') {
        editor.commands.command(({ tr }: any) => {
          tr.setNodeAttribute(pos, 'handle', handle)
          return true
        })
      }
    }
    return handle
  } catch {
    return null
  }
}

// Renders a "shop the product" card inside blog content. The card/link is a
// static snapshot (title/price/thumbnail at insert time) since blog content
// is plain HTML, but the "Add to Cart" button is hydrated client-side by
// BlogProductEmbedHydrator (see app/(website)/blog/[slug]/page.tsx), which
// fetches the live product by data-handle and adds it to the real cart —
// same behaviour as the shop page's product cards.
export const ProductCardNode = Node.create<ProductCardOptions>({
  name: 'productCard',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'product-embed',
      },
    }
  },

  addAttributes() {
    return {
      productId: { default: null },
      handle: { default: null },
      title: { default: '' },
      thumbnail: { default: null },
      price: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.product-embed',
        getAttrs: (el) => {
          const node = el as HTMLElement
          return {
            productId: node.getAttribute('data-product-id'),
            handle: node.getAttribute('data-handle'),
            title:
              node.getAttribute('data-title') ||
              node.querySelector('.product-embed-title')?.textContent?.trim() ||
              '',
            thumbnail: node.querySelector('img')?.getAttribute('src') || null,
            price:
              node.getAttribute('data-price') ||
              node.querySelector('.product-embed-price')?.textContent?.trim() ||
              null,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return buildProductCardSpec(
      node.attrs as ProductCardAttrs,
      this.options.HTMLAttributes,
      HTMLAttributes,
    )
  },

  addCommands() {
    return {
      setProductCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    }
  },

  // Editor-only UI: wraps the same markup renderHTML produces with a small
  // "remove" button so an admin can delete an inserted product card without
  // needing to select + backspace it. This DOM is only what TipTap shows
  // while editing — editor.getHTML() serializes from the node's renderHTML,
  // so the remove button never ends up in saved/public content.
  //
  // Auto-heal: if the saved embed has an empty handle (written before the
  // route.ts fix), we fetch the real handle from the admin API and patch
  // both the DOM and the node attrs so the next Save persists the fix.
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const attrs = node.attrs as ProductCardAttrs
      const outer = document.createElement('div')
      outer.className = 'product-embed-wrapper'
      outer.contentEditable = 'false'

      const { dom } = DOMSerializer.renderSpec(
        document,
        buildProductCardSpec(attrs, {
          class: 'product-embed',
        }),
      )
      outer.appendChild(dom)

      // Auto-heal: if handle is missing, fetch and patch in place
      if (!attrs.handle && attrs.productId) {
        hydrateHandle(
          attrs.productId,
          editor,
          getPos as () => number | undefined,
          dom as HTMLElement,
        )
      }

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'product-embed-remove-btn'
      removeBtn.setAttribute('aria-label', 'Remove product card')
      removeBtn.title = 'Remove product card'
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

export default ProductCardNode
