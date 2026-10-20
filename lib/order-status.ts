import { getOrderFlow, type FlowOrder, type FlowStage } from '@/lib/order-flow'

export type DisplayOrderStatus = FlowStage

export function getDisplayOrderStatus(o: FlowOrder): DisplayOrderStatus {
  return getOrderFlow(o).stage
}
