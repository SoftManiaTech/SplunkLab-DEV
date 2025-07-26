"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, X } from "lucide-react"

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id?: string
  prefill: {
    name: string
    email: string
    contact: string
  }
  notes: {
    environment: string
    splunk_install?: string
    botsv3_dataset?: string
  }
  theme: {
    color: string
  }
  handler: (response: any) => void
  modal: {
    ondismiss: () => void
  }
}

declare global {
  interface Window {
    Razorpay: any
  }
}

interface RazorpayCheckoutProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  packageDetails: {
    envTitle?: string
    envId: string
  }
  onSuccess: (response: any) => void
  onError: (error: any) => void
}

export function RazorpayCheckout({
  isOpen,
  onClose,
  amount,
  packageDetails,
  onSuccess,
  onError,
}: RazorpayCheckoutProps) {
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPhone, setUserPhone] = useState("")
  const [splunkInstall, setSplunkInstall] = useState<"yes" | "no" | "">("")
  const [botsv3Dataset, setBotsv3Dataset] = useState<"yes" | "no" | "">("")
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const getEnvironmentName = (envId: string, amount: number): string => {
    switch (envId) {
      case "standalone":
        return `Splunk-SE-${amount}`
      case "distributed":
        return `Splunk-DNC-${amount}`
      case "clustered":
        return `Splunk-DC-${amount}`
      case "syslog-ng":
        return `syslog-${amount}`
      case "mysql-logs":
        return `mysql-${amount}`
      case "mssql-logs":
        return `mssql-${amount}`
      case "windows-ad-dns":
        return `winadns-${amount}`
      case "linux-data-sources":
        return `linux-${amount}`
      default:
        return `package-${amount}`
    }
  }

  const isSplunkPackage = (envId: string): boolean => {
    return ["standalone", "distributed", "clustered"].includes(envId)
  }

  const environmentName = getEnvironmentName(packageDetails.envId, amount)
  const splunkPackage = isSplunkPackage(packageDetails.envId)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original overflow
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight

      // Lock body scroll
      document.body.style.overflow = "hidden"
      document.body.style.paddingRight = "0px"

      // Prevent wheel events on body when modal is open
      const preventBodyScroll = (e: WheelEvent) => {
        const target = e.target as Element
        const modalContent = document.querySelector("[data-modal-content]")

        // If the scroll is happening outside the modal content, prevent it
        if (modalContent && !modalContent.contains(target)) {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      // Prevent touch scroll on body
      const preventTouchScroll = (e: TouchEvent) => {
        const target = e.target as Element
        const modalContent = document.querySelector("[data-modal-content]")

        if (modalContent && !modalContent.contains(target)) {
          e.preventDefault()
        }
      }

      // Add event listeners
      document.addEventListener("wheel", preventBodyScroll, { passive: false })
      document.addEventListener("touchmove", preventTouchScroll, { passive: false })

      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight

        // Remove event listeners
        document.removeEventListener("wheel", preventBodyScroll)
        document.removeEventListener("touchmove", preventTouchScroll)
      }
    }
  }, [isOpen])

  useEffect(() => {
    // Reset form fields when dialog opens
    if (isOpen) {
      setUserName("")
      setUserEmail("")
      setUserPhone("")
      setSplunkInstall("")
      setBotsv3Dataset("")
      setFormError(null)
    }
  }, [isOpen])

  const handleProceed = async () => {
    setFormError(null)
    if (!userName || !userEmail || !userPhone) {
      setFormError("Please fill in all common details.")
      return
    }

    if (splunkPackage && (!splunkInstall || !botsv3Dataset)) {
      setFormError("Please fill in all Splunk-specific fields.")
      return
    }

    setLoading(true)

    try {
      // Create order on your backend
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.message || "Failed to create Razorpay order.")
      }

      const order = await orderResponse.json()

      const notes: any = {
        environment: environmentName,
      }

      if (splunkPackage) {
        notes.splunk_install = splunkInstall
        notes.botsv3_dataset = botsv3Dataset
      }

      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_your_key_id", // Replace with your Razorpay key
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "Splunk Lab Environments",
        description: `${packageDetails.envTitle} - ${environmentName}`,
        order_id: order.id, // Pass the order ID from your backend
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        notes: notes,
        theme: {
          color: "#16a34a",
        },
        handler: (response: any) => {
          onSuccess({
            ...response,
            userDetails: {
              name: userName,
              email: userEmail,
              phone: userPhone,
              splunk_install: splunkInstall,
              botsv3_dataset: botsv3Dataset,
              environment: environmentName,
            },
          })
          setLoading(false)
          onClose() // Close the custom dialog after Razorpay opens
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            onClose() // Close the custom dialog if Razorpay modal is dismissed
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", (response: any) => {
        onError(response.error)
        setLoading(false)
        onClose() // Close the custom dialog if payment fails
      })
      rzp.open()
    } catch (err: any) {
      console.error("Error during payment process:", err)
      setFormError(err.message || "An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !window.Razorpay) {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      script.onload = () => {
        // Razorpay script loaded
      }
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Premium Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Premium Modal Container */}
      <div
        className="relative w-[95vw] max-w-lg mx-auto bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] flex flex-col overflow-hidden"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Premium Header with Close Button */}
        <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 p-6 pb-4 border-b border-green-100 dark:border-gray-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/80 dark:hover:bg-gray-600/80 transition-colors duration-200 group"
          >
            <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200" />
          </button>

          <div className="text-center pr-12">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              Enter Your Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              Please provide your information to proceed with the payment
            </p>
          </div>
        </div>

        {/* Premium Scrollable Content */}
        <div
          data-modal-content
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-transparent hover:scrollbar-thumb-green-300 p-6"
          onWheel={(e) => {
            // Allow scrolling within this container
            e.stopPropagation()
          }}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center"
              >
                Full Name <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-green-500 dark:focus:border-green-400 focus:shadow-lg focus:shadow-green-100 dark:focus:shadow-green-900/20 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center"
              >
                Email Address <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-green-500 dark:focus:border-green-400 focus:shadow-lg focus:shadow-green-100 dark:focus:shadow-green-900/20 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center"
              >
                Phone Number <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-green-500 dark:focus:border-green-400 focus:shadow-lg focus:shadow-green-100 dark:focus:shadow-green-900/20 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
              />
            </div>

            {splunkPackage && (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="splunk-install"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center"
                  >
                    Splunk Installation <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select value={splunkInstall} onValueChange={(value: "yes" | "no") => setSplunkInstall(value)}>
                    <SelectTrigger
                      id="splunk-install"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-0 focus:border-green-500 dark:focus:border-green-400 focus:shadow-lg focus:shadow-green-100 dark:focus:shadow-green-900/20 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
                    >
                      <SelectValue placeholder="Do you want Splunk to be installed?" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl">
                      <SelectItem value="yes" className="hover:bg-green-50 dark:hover:bg-green-900/20">
                        yes
                      </SelectItem>
                      <SelectItem value="no" className="hover:bg-green-50 dark:hover:bg-green-900/20">
                        no
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="botsv3-dataset"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center"
                  >
                    BotsV3 Dataset <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select value={botsv3Dataset} onValueChange={(value: "yes" | "no") => setBotsv3Dataset(value)}>
                    <SelectTrigger
                      id="botsv3-dataset"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-0 focus:border-green-500 dark:focus:border-green-400 focus:shadow-lg focus:shadow-green-100 dark:focus:shadow-green-900/20 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-500"
                    >
                      <SelectValue placeholder="Include BotsV3 dataset?" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl">
                      <SelectItem value="yes" className="hover:bg-green-50 dark:hover:bg-green-900/20">
                        yes
                      </SelectItem>
                      <SelectItem value="no" className="hover:bg-green-50 dark:hover:bg-green-900/20">
                        no
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="environment" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Environment Name
              </Label>
              <Input
                id="environment"
                readOnly
                value={environmentName}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Premium Footer */}
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border-t border-gray-200 dark:border-gray-600 p-6">
          {formError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">{formError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProceed}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
