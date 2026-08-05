import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCart,
  addToCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from '@/lib/api/store'
import { useCartStore } from '@/store/cartStore'

export function useCart() {
  const { cartId, setCartId } = useCartStore()
  const queryClient = useQueryClient()

  const { data: cart } = useQuery({
    queryKey: ['cart', cartId],
    queryFn: () => getCart(cartId!),
    enabled: !!cartId,
  })

  const addItem = useMutation({
    mutationFn: async ({
      variantId,
      quantity,
      metadata,
    }: {
      variantId: string
      quantity?: number
      metadata?: Record<string, any>
    }) => {
      let id = cartId
      if (!id) {
        const newCart = await createCart()
        setCartId(newCart.id)
        id = newCart.id
      }
      return addToCart(id as string, variantId, quantity ?? 1, metadata)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  const removeItem = useMutation({
    mutationFn: ({ lineItemId }: { lineItemId: string }) =>
      removeFromCart(cartId!, lineItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  const updateItem = useMutation({
    mutationFn: ({
      lineItemId,
      quantity,
    }: {
      lineItemId: string
      quantity: number
    }) => updateCartItem(cartId!, lineItemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  return { cart, addItem, removeItem, updateItem }
}
