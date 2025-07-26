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
import { event as sendToGA4 } from "@/lib/gtag"
import { RazorpayCheckout } from "@/components/razorpay-checkout"
// Splunk Logging Integration
const getClientIp = async () => {
  try {
    const res = await fetch("https://api.ipify.org?format=json")
    const data = await res.json()
    return data.ip || "unknown"
  } catch {
    return "unknown"
  }
}

const sendLogToSplunk = async ({
  sessionId = "anonymous-session",
  action = "unknown_action",
  title = "User Event",
  browser = navigator.userAgent,
  ipOverride,
  details = {},
}: {
  sessionId?: string
  action: string
  title?: string
  browser?: string
  ipOverride?: string
  details?: Record<string, any>
}) => {
  try {
    const ip = ipOverride || (await getClientIp())

    const payload: Record<string, any> = {
      title,
      action,
      session: sessionId,
      ip,
      browser,
      timestamp: new Date().toISOString(),
      ...details,
    }

    // ✅ 1. Send to Splunk
    await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    // ✅ 2. Send to GA4
    sendToGA4({
      action, // e.g., "select_package"
      params: {
        session: sessionId,
        ip,
        browser,
        title,
        ...details,
      },
    })
  } catch (err) {
    console.error("Splunk + GA4 logging failed:", err)
  }
}

interface SelectedPackageDetails {
  amount: number
  hours: number
  components?: string[]
  envTitle?: string
  envId?: string // Add this line
}

export default function LabEnvironments() {
  const [selectedPricing, setSelectedPricing] = useState<Record<string, { amount: number; days: number }>>({})
  const [showContactModal, setShowContactModal] = useState(false)
  const router = useRouter()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({})
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<SelectedPackageDetails | null>(null)
  const [policyConfirmed, setPolicyConfirmed] = useState(false)
  // ✅ Correctly persistent session ID across reloads
  const sessionId = useRef("")
  const sessionStart = useRef(performance.now())
  // State to manage the multi-step flow: 0=closed, 1=confirm package, 2=customer details
  const [currentStep, setCurrentStep] = useState(0)
  const popupRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const existingSession = sessionStorage.getItem("lab-session-id")
    if (existingSession) {
      sessionId.current = existingSession
    } else {
      const newSession = `SID-${Math.random().toString(36).substring(2, 10)}`
      sessionId.current = newSession
      sessionStorage.setItem("lab-session-id", newSession)
    }

    //  Mark refresh intent on load
    sessionStorage.setItem("lab-refreshing", "true")

    //  Delay to detect if page was refreshed or closed
    const handleBeforeUnload = () => {
      // Clear the marker so we can detect if the next page sets it again
      sessionStorage.removeItem("lab-refreshing")

      setTimeout(() => {
        const refreshed = sessionStorage.getItem("lab-refreshing")
        if (!refreshed) {
          // Not refreshed → assume tab closed → send log
          const durationInSeconds = Math.floor((performance.now() - sessionStart.current) / 1000)

          navigator.sendBeacon(
            "/api/log",
            JSON.stringify({
              ip: "pending",
              session: sessionId.current,
              event: "User Session Ended",
              action: "user_session_ended",
              title: "User session ended",
              browser: navigator.userAgent,
              extra: {
                durationInSeconds,
                timestamp: new Date().toISOString(),
              },
            }),
          )
        }
      }, 100)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

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
    const planSessionId = `PLAN-${Math.random().toString(36).substring(2, 10)}`

    sendLogToSplunk({
      sessionId: planSessionId,
      action: "select_package",
      title: "User selected a package",
      details: {
        amount: option.amount,
        hours: option.hours,
        envTitle: env.title,
      },
    })

    setSelectedPackageDetails({
      amount: option.amount,
      hours: option.hours,
      components: env.components,
      envTitle: env.title,
      envId: env.id, // Add this line
    })

    event({
      // action: "select_package",
      action: "user_selected_package",
      params: {
        package_name: env.title,
        amount: option.amount,
        hours: option.hours,
        page: "LabEnvironments",
      },
    })

    setPolicyConfirmed(false)
    setCurrentStep(1) // Open the first popup (Confirm Your Package)
  }

  const handleProceedToCustomerDetails = () => {
    sendLogToSplunk({
      sessionId: sessionId.current,
      action: "user_clicked_next_to_customer_details",
      title: "User clicked next to customer details",
      details: {
        package: selectedPackageDetails?.envTitle,
        amount: selectedPackageDetails?.amount,
        hours: selectedPackageDetails?.hours,
      },
    })

    setCurrentStep(2) // Move to the second step (Customer Details)
  }

  const handleRazorpaySuccess = async (response: any) => {
    try {
      // Verify payment on server - Update the API endpoint
      const verifyResponse = await fetch("/api/razorpay/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      })

      if (verifyResponse.ok) {
        sendLogToSplunk({
          sessionId: sessionId.current,
          action: "payment_success_razorpay",
          title: "Razorpay payment success",
          details: {
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            userDetails: response.userDetails,
          },
        })

        setCurrentStep(0) // Close all popups
        setShowSuccessPopup(true)

        event({
          action: "payment_success",
          params: {
            source: "LabEnvironments",
            payment_method: "razorpay",
            payment_id: response.razorpay_payment_id,
          },
        })
      } else {
        throw new Error("Payment verification failed")
      }
    } catch (error) {
      console.error("Payment verification error:", error)
      handleRazorpayError({ description: "Payment verification failed" })
    }
  }

  const handleRazorpayError = (error: any) => {
    sendLogToSplunk({
      sessionId: sessionId.current,
      action: "payment_failure_razorpay",
      title: "Razorpay payment failure",
      details: {
        error: error.description || "Payment failed",
      },
    })

    setCurrentStep(0) // Close all popups

    event({
      action: "payment_failure",
      params: {
        source: "LabEnvironments",
        payment_method: "razorpay",
        error: error.description,
      },
    })

    alert("Payment failed. Please try again.")
  }

  //  Added Visit vs Reload Tracking Here
  useEffect(() => {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    const navType = navEntry?.type || (performance as any).navigation?.type

    const isFirstVisit = !sessionStorage.getItem("lab-page-visited")

    if (navType === "reload" || !isFirstVisit) {
      sendLogToSplunk({
        sessionId: sessionId.current,
        action: "user_reloaded_environment",
        title: "User reloaded environment",
      })
    } else {
      sendLogToSplunk({
        sessionId: sessionId.current,
        action: "user_visited_environment",
        title: "User visited environment",
      })
      sessionStorage.setItem("lab-page-visited", "true")
    }
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("payment") === "success") {
      sendLogToSplunk({
        sessionId: sessionId.current,
        action: "payment_success",
        title: "Payment success",
      })
      setShowSuccessPopup(true)
      event({
        action: "payment_success",
        params: { source: "LabEnvironments" },
      })
    }

    if (params.get("payment") === "failure") {
      sendLogToSplunk({
        sessionId: sessionId.current,
        action: "payment_failure",
        title: "Payment failure",
      })
      event({
        action: "payment_failure",
        params: { source: "LabEnvironments" },
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
        sendLogToSplunk({
          sessionId: sessionId.current,
          action: "devtools_detected",
          title: "DevTools Detected",
        })
        window.location.href = "https://splunklab.softmania.in/blocked"
      }
    }

    window.addEventListener("resize", checkDevTools)
    return () => window.removeEventListener("resize", checkDevTools)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <LabHeader
        onContactClick={() => {
          setShowContactModal(true)
          sendLogToSplunk({
            sessionId: sessionId.current,
            action: "user_clicked_contact",
            title: "User clicked contact",
            details: { source: "header_contact" },
          })
        }}
      />

      <LabHero />

      <LabPricingModels onPackageSelect={handlePackageSelect} selectedPricing={selectedPricing} />
      <Dialog open={currentStep === 1} onOpenChange={(open) => !open && setCurrentStep(0)}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto bg-white rounded-lg shadow-xl border border-gray-200 max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 text-center p-6 pb-4 border-b border-gray-100">
            {/* Minimalistic Tracker UI */}
            <div className="flex justify-center items-center gap-2 mb-4">
              <div
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  currentStep === 1 ? "bg-green-600" : "bg-gray-300"
                }`}
              ></div>
              <div
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  currentStep === 2 ? "bg-green-600" : "bg-gray-300"
                }`}
              ></div>
            </div>
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
                  onCheckedChange={(checked) => setPolicyConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="policy-confirm"
                  className="text-xs sm:text-sm font-medium leading-relaxed cursor-pointer"
                >
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
              <Button
                variant="outline"
                onClick={() => setCurrentStep(0)} // Close the modal
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToCustomerDetails} // Changed to navigate to next step
                disabled={!policyConfirmed}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                Next {/* Changed button text */}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />

      <div
        onClick={() => {
          sendLogToSplunk({
            sessionId: sessionId.current,
            action: "user_clicked_faq",
            title: "User clicked FAQ",

            details: {
              location: "LabEnvironments Page",
              timestamp: new Date().toISOString(),
            },
          })
        }}
      >
        <LabFAQ />
      </div>

      <LabFooter />
      <Salesiq />
      {selectedPackageDetails && (
        <RazorpayCheckout
          isOpen={currentStep === 2} // Open when currentStep is 2
          onClose={() => setCurrentStep(0)} // Close all popups
          onPreviousStep={() => setCurrentStep(1)} // Added prop to go back to step 1
          amount={selectedPackageDetails.amount || 0}
          packageDetails={{
            envTitle: selectedPackageDetails.envTitle,
            envId: selectedPackageDetails.envId || "",
          }}
          onSuccess={handleRazorpaySuccess}
          onError={handleRazorpayError}
          currentStep={currentStep} // Pass current step for tracker UI
        />
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            ref={popupRef}
            className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 transition-all"
          >
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              aria-label="Close"
            >
              <span className="text-lg font-semibold">&times;</span>
            </button>
            <h2 className="text-2xl font-semibold text-green-600 mb-3">Payment Successful!</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Your lab setup ticket has been created successfully.
              <br />
              Lab setup in progress — ready within <strong>20-30 mins</strong>.
              <br />
              You'll get a welcome email once it's live.
              <br />
              Server auto-stops after <strong>2 hours</strong>, or stop manually to save usage.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
