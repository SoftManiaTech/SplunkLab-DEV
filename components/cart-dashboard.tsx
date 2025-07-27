"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ShoppingCart, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CartItem } from "./cart-sidebar"

interface CartDashboardProps {
  cartItems: CartItem[]
  onRemoveItem: (id: string) => void
  onOpenCart: () => void
}

export function CartDashboard({ cartItems, onRemoveItem, onOpenCart }: CartDashboardProps) {
  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.amount, 0)
  }, [cartItems])

  const totalItems = cartItems.length

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 text-white shadow-2xl border-t border-gray-800 md:rounded-t-2xl md:mx-auto md:max-w-4xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-5 gap-4">
            {/* Mobile View: Summary and Button */}
            <div className="flex md:hidden w-full justify-between items-center">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-lg">Your Cart ({totalItems})</span>
              </div>
              <Button
                onClick={onOpenCart}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-semibold shadow-md"
              >
                View Cart
              </Button>
            </div>

            {/* Desktop View: Detailed Items and Total */}
            <div className="hidden md:flex flex-1 items-center gap-6 overflow-hidden">
              <div className="flex items-center gap-3 flex-shrink-0">
                <ShoppingCart className="w-6 h-6 text-green-400" />
                <span className="font-bold text-xl">Your Cart</span>
                <span className="text-gray-400 text-base">({totalItems} items)</span>
              </div>
              <ScrollArea className="flex-1 whitespace-nowrap py-1 px-2 -my-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600">
                <div className="flex gap-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-sm font-medium gap-2 flex-shrink-0 text-gray-300"
                    >
                      <span>{item.title}</span>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${item.title}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Desktop View: Total and Button */}
            <div className="hidden md:flex items-center gap-6 flex-shrink-0">
              <div className="text-xl font-bold text-white">Total: ₹{totalAmount}</div>
              <Button
                onClick={onOpenCart}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg text-base font-semibold shadow-md"
              >
                View Cart
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
