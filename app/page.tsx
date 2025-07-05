"use client"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Salesiq from "@/components/salesiq"
import { LabHeader } from "@/components/lab-header"
import { LabFAQ } from "@/components/lab-faq"
import { LabFooter } from "@/components/lab-footer"
import { ContactModal } from "@/components/contact-modal"
import { Server, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { LabHero } from "@/components/lab-hero"
import { LabPricingModels, type EnvironmentOption } from "@/components/lab-pricing-models"
import { event } from "@/lib/gtag"

interface SelectedPackageDetails {
  amount: number
  hours: number
  paymentLink: string
  components?: string[]
  envTitle: string
}

export default function LabEnvironments() {
  const [selectedPricing, setSelectedPricing] = useState<Record<string, { amount: number; days: number }>>({})
  const [showContactModal, setShowContactModal] = useState(false)
  const router = useRouter()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({})
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<SelectedPackageDetails | null>(null)
  const [policyConfirmed, setPolicyConfirmed] = useState(false)

  const toggleFeatures = (envId: string) => {
    setExpandedFeatures((prev) => ({
      ...prev,
      [envId]: !prev[envId],
    }))
  }

  const toggleInfo = (envId: string) => {
    setExpandedInfo((prev) => ({
      ...prev,
      [envId]: !prev[envId],
    }))
  }

  const handlePackageSelect = (env: EnvironmentOption, option: (typeof env.pricing)[0]) => {
    setSelectedPackageDetails({
      amount: option.amount,
      hours: option.hours,
      paymentLink: option.paymentLink,
      components: env.components,
      envTitle: env.title,
    })

    event({
      action: "select_package",
      params: {
        package_name: env.title,
        amount: option.amount,
        hours: option.hours,
        page: "LabEnvironments",
      },
    })

    setPolicyConfirmed(false)
    setShowConfirmationModal(true)
  }

  const handleProceedToPayment = () => {
    if (selectedPackageDetails?.paymentLink) {
      window.location.href = selectedPackageDetails.paymentLink
      setShowConfirmationModal(false)
    }
  }

  useEffect(() => {
    if (showConfirmationModal || showContactModal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showConfirmationModal, showContactModal])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get("payment") === "success") {
      setShowSuccessPopup(true)
      event({
        action: "payment_success",
        params: {
          source: "LabEnvironments",
          timestamp: new Date().toISOString(),
        },
      })
    }

    if (params.get("payment") === "failure") {
      event({
        action: "payment_failure",
        params: {
          source: "LabEnvironments",
          timestamp: new Date().toISOString(),
        },
      })
    }

    const url = new URL(window.location.href)
    url.searchParams.delete("payment")
    window.history.replaceState({}, document.title, url.pathname)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowSuccessPopup(false)
      }
    }

    if (showSuccessPopup) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSuccessPopup])

  useEffect(() => {
    const threshold = 160
    const checkDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold) {
        window.location.href = "https://splunklab.softmania.com/blocked"
      }
    }

    window.addEventListener("resize", checkDevTools)
    return () => window.removeEventListener("resize", checkDevTools)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 🔹 Track contact modal open from header */}
      <LabHeader
        onContactClick={() => {
          setShowContactModal(true)
          event({
            action: "support_modal_open",
            params: {
              source: "header_contact",
              page: "LabEnvironments",
            },
          })
        }}
      />

      <LabHero />

      <LabPricingModels onPackageSelect={handlePackageSelect} selectedPricing={selectedPricing} />

      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto bg-white rounded-lg shadow-xl border border-gray-200 max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 text-center p-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">Confirm Your Package</DialogTitle>
            {selectedPackageDetails && (
              <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                You are about to purchase:{" "}
                <span className="font-semibold text-green-700 block sm:inline mt-1 sm:mt-0">
                  {selectedPackageDetails.envTitle}
                </span>
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 sm:space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-4 sm:space-y-6 text-gray-700 text-xs sm:text-sm">
              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Validity Information:</h4>
                  <ul className="leading-relaxed text-xs sm:text-sm space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Your server will be terminated based on whichever comes first:</span>
                    </li>
                    <li className="flex items-start gap-2 ml-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span>
                        Usage of <span className="font-medium">{selectedPackageDetails?.hours} hours</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2 ml-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span>
                        Approximately{" "}
                        <span className="font-medium">
                          {selectedPackageDetails ? Math.ceil(selectedPackageDetails.hours / 2) : 0} days
                        </span>{" "}
                        from the time of provisioning.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {selectedPackageDetails?.envTitle === "Splunk Distributed Cluster" && (
                <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Server className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Splunk Developer License:</h4>
                    <p className="leading-relaxed text-xs sm:text-sm">
                      Do you have a Splunk Developer License? If not, you can apply for one{" "}
                      <a
                        href="https://dev.splunk.com/enterprise/dev_license"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        here
                      </a>
                      .
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 pt-2">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Checkbox
                  id="policy-confirm"
                  checked={policyConfirmed}
                  onCheckedChange={setPolicyConfirmed}
                  className="mt-0.5"
                />
                <label htmlFor="policy-confirm" className="text-xs sm:text-sm font-medium leading-relaxed cursor-pointer">
                  I understand and agree to{" "}
                  <Link
                    href="/terms"
                    className="text-blue-600 hover:underline font-medium"
                    onClick={() =>
                      event({
                        action: "click_disclaimer",
                        params: { type: "terms", page: "LabEnvironments" },
                      })
                    }
                  >
                    terms and conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/refund"
                    className="text-blue-600 hover:underline font-medium"
                    onClick={() =>
                      event({
                        action: "click_disclaimer",
                        params: { type: "refund", page: "LabEnvironments" },
                      })
                    }
                  >
                    refund policy
                  </Link>
                  .
                </label>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 p-4 sm:p-6 pt-4 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setShowConfirmationModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
                Cancel
              </Button>
              <Button
                onClick={handleProceedToPayment}
                disabled={!policyConfirmed}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
      <LabFAQ />
      <LabFooter />
      <Salesiq />

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div ref={popupRef} className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 transition-all">
            <button onClick={() => setShowSuccessPopup(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white" aria-label="Close">
              <span className="text-lg font-semibold">&times;</span>
            </button>
            <h2 className="text-2xl font-semibold text-green-600 mb-3">Payment Successful!</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Your lab setup ticket has been created.
              <br />
              Please check your email for confirmation.
              <br />
              Lab will be delivered within <strong>10–12 hours</strong> during <strong>10 AM – 6 PM IST</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
