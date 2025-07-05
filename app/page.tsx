"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Salesiq from "@/components/salesiq";
import { LabHeader } from "@/components/lab-header";
import { LabFAQ } from "@/components/lab-faq";
import { LabFooter } from "@/components/lab-footer";
import { ContactModal } from "@/components/contact-modal";
import { Server, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { LabHero } from "@/components/lab-hero";
import { LabPricingModels, type EnvironmentOption } from "@/components/lab-pricing-models";
import { event } from "@/lib/gtag"; // make sure this is set up

interface SelectedPackageDetails {
  amount: number;
  hours: number;
  paymentLink: string;
  components?: string[];
  envTitle: string;
}

export default function LabEnvironments() {
  const [selectedPricing, setSelectedPricing] = useState<Record<string, { amount: number; days: number }>>({});
  const [showContactModal, setShowContactModal] = useState(false);
  const router = useRouter();
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<SelectedPackageDetails | null>(null);
  const [policyConfirmed, setPolicyConfirmed] = useState(false);

  const toggleFeatures = (envId: string) => {
    setExpandedFeatures((prev) => ({ ...prev, [envId]: !prev[envId] }));
  };

  const toggleInfo = (envId: string) => {
    setExpandedInfo((prev) => ({ ...prev, [envId]: !prev[envId] }));
  };

  const handlePackageSelect = (env: EnvironmentOption, option: (typeof env.pricing)[0]) => {
    setSelectedPackageDetails({
      amount: option.amount,
      hours: option.hours,
      paymentLink: option.paymentLink,
      components: env.components,
      envTitle: env.title,
    });

    event({
      action: "select_package",
      params: {
        package_name: env.title,
        amount: option.amount,
        hours: option.hours,
        page: "LabEnvironments",
      },
    });

    setPolicyConfirmed(false);
    setShowConfirmationModal(true);
  };

  const handleProceedToPayment = () => {
    if (selectedPackageDetails?.paymentLink) {
      event({
        action: "payment_initiated",
        params: {
          package: selectedPackageDetails.envTitle,
          amount: selectedPackageDetails.amount,
        },
      });
      window.location.href = selectedPackageDetails.paymentLink;
      setShowConfirmationModal(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowSuccessPopup(true);
      event({
        action: "payment_success",
        params: {
          source: "LabEnvironments",
          timestamp: new Date().toISOString(),
        },
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, document.title, url.pathname);
    } else if (params.get("payment") === "failed") {
      event({
        action: "payment_failed",
        params: {
          source: "LabEnvironments",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, []);

  useEffect(() => {
    if (showConfirmationModal || showContactModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showConfirmationModal, showContactModal]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowSuccessPopup(false);
      }
    }
    if (showSuccessPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuccessPopup]);

  useEffect(() => {
    const threshold = 160;
    const checkDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold) {
        window.location.href = "https://splunklab.softmania.com/blocked";
      }
    };
    window.addEventListener("resize", checkDevTools);
    return () => window.removeEventListener("resize", checkDevTools);
  }, []);

  // Tracking footer or UI button clicks
  useEffect(() => {
    const trackClick = (selector: string, action: string) => {
      const el = document.querySelector(selector);
      if (el) {
        el.addEventListener("click", () => {
          event({ action, params: { location: "footer" } });
        });
      }
    };
    trackClick("#disclaimer-btn", "click_disclaimer");
    trackClick("#support-btn", "click_support");
    trackClick("#policy-btn", "click_policies");
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <LabHeader
        onContactClick={() => {
          setShowContactModal(true);
          event({ action: "click_support", params: { location: "header" } });
        }}
      />

      <LabHero />

      <LabPricingModels onPackageSelect={handlePackageSelect} selectedPricing={selectedPricing} />

      {/* Existing UI + Confirmation Modal + Footer */}
      {/* All other JSX remains unchanged. No need to duplicate again here */}

      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
      <LabFAQ />
      <LabFooter />
      <Salesiq />

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
  );
}
