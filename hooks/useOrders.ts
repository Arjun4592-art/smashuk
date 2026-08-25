import { useQuery } from '@tanstack/react-query';
import { getCustomerOrders, getCustomerOrder } from '@/lib/api/store';
import { useAuthStore } from '@/store/authStore';
export function useOrders() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  return useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: getCustomerOrders,
    enabled: isAuthenticated && user?.role === 'customer',
    staleTime: 60 * 1000
  });
}
export function useOrder(id: string) {
  return useQuery({
    queryKey: ['customer-order', id],
    queryFn: () => getCustomerOrder(id),
    enabled: !!id,
    staleTime: 60 * 1000
  });
}
