"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SoftmaniaLogo } from "@/components/softmania-logo"
import Link from 'next/link';
import Salesiq from "@/components/salesiq"
import {
  Server,
  Database,
  Network,
  CheckCircle,
  Star,
  Phone,
  MessageCircle,
  Calendar,
  Headphones,
  Mail,
  UserRoundCheck,
  Check,
  ArrowUpRightFromSquare,
  Info,
} from "lucide-react"

interface EnvironmentOption {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  description: string
  features: string[]
  info: string[]
  components?: string[]
  pricing: { amount: number; days?: number; hours: number, popular?: boolean, paymentLink: string }[]
  redirectUrl: string
  color: string
  bgColor: string
  demoVideoId: string
  demoTitle: string
  demoDuration: string
}

const environments: EnvironmentOption[] = [
  {
    id: "standalone",
    title: " Splunk Standalone",
    subtitle: "Perfect for Learning",
    icon: <Server className="w-6 h-6" />,
    description: "Single instance with BOTSv3 dataset for hands-on security training and threat hunting practice.",
    features: [
      "Pre-configured Splunk instance (optional)",
      "BOTSv3 Security Dataset (Real-world logs for threat hunting). (optional)",
      "Supporting Add-ons for seamless data ingestion. (optional)",
    ],
    info: ["(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)", "Splunk Enterprise Version: 9.4.1",],
    components: ["Splunk Enterprise"],
    pricing: [
      { amount: 100, hours: 10, paymentLink: "https://pages.razorpay.com/Splunk-SE-100" },
      { amount: 200, hours: 21, paymentLink: "https://pages.razorpay.com/Splunk-SE-200" },
      { amount: 300, hours: 33, paymentLink: "https://pages.razorpay.com/Splunk-SE-300" },
      { amount: 400, hours: 45, paymentLink: "https://pages.razorpay.com/Splunk-SE-400" },
      { amount: 500, hours: 56, paymentLink: "https://pages.razorpay.com/Splunk-SE-500" },
    ],
    redirectUrl: "https://softmania.com/splunk-standalone-lab",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    demoVideoId: "dQw4w9WgXcQ",
    demoTitle: "Standalone Server Complete Walkthrough",
    demoDuration: "8:45"
  },
  {
    id: "distributed",
    title: "Splunk Distributed Non-Clustered",
    subtitle: "Scalable Architecture",
    icon: <Network className="w-6 h-6" />,
    description: "Multi-component architecture with search head, indexer, and forwarders for realistic deployments.",
    features: [
      "4-component architecture",
      "Distributed search capabilities",
      "BOTSv3 Security Dataset (Real-world logs for threat hunting). (optional)",
    ],
    info: ["(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)", "Splunk Enterprise Version: 9.4.1",],
    components: ["Search Head", "Indexer", "Heavy Forwarder", "Universal Forwarder"],
    pricing: [
      { amount: 200, hours: 4, paymentLink: "https://pages.razorpay.com/Splunk-DNC-200" },
      { amount: 500, hours: 13, paymentLink: "https://pages.razorpay.com/Splunk-DNC-500" },
      { amount: 1000, hours: 27, paymentLink: "https://pages.razorpay.com/Splunk-DNC-1000", popular: true },
      { amount: 1500, hours: 42, paymentLink: "https://pages.razorpay.com/Splunk-DNC-1500" },
    ],
    redirectUrl: "https://softmania.com/splunk-distributed-lab",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    demoVideoId: "dQw4w9WgXcQ",
    demoTitle: "Distributed Environment Deep Dive",
    demoDuration: "12:30"
  },
  {
    id: "clustered",
    title: "Splunk Distributed Cluster",
    subtitle: "High Availability",
    icon: <Database className="w-6 h-6" />,
    description:
      "Full enterprise deployment with clustering, load balancing, and fault tolerance for production scenarios.",
    features: [
      "Search head cluster (3 nodes)",
      "Indexer cluster (3 nodes)",
      "Management server features (Deployer, License manager, Deployment server, Monitoring Console)",
    ],
    info: ["(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)", "Splunk Enterprise Version: 9.4.1",],
    components: ["SH Cluster", "IDX Cluster", "Cluster Master", "HF", "Management server"],
    pricing: [
      { amount: 1000, hours: 11, paymentLink: "https://pages.razorpay.com/Splunk-DC-1000" },
      { amount: 2000, hours: 23, paymentLink: "https://pages.razorpay.com/Splunk-DC-2000" },
      { amount: 3000, hours: 37, paymentLink: "https://pages.razorpay.com/Splunk-DC-3000", popular: true },
      { amount: 4000, hours: 49, paymentLink: "https://pages.razorpay.com/Splunk-DC-4000" },
      { amount: 5000, hours: 62, paymentLink: "https://pages.razorpay.com/Splunk-DC-5000" },
    ],
    redirectUrl: "https://softmania.com/splunk-cluster-lab",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    demoVideoId: "dQw4w9WgXcQ",
    demoTitle: "Enterprise Cluster Architecture Tour",
    demoDuration: "15:20"
  },
]

export default function LabEnvironments() {
  const [selectedPricing, setSelectedPricing] = useState<Record<string, { amount: number; days: number }>>({})
  const [showContactModal, setShowContactModal] = useState(false)
  const router = useRouter()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowSuccessPopup(true);
      // Remove the query param from URL after showing
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

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
    const threshold = 160; // DevTools usually shrink the window height
    const checkDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold) {
        window.location.href = 'https://splunklab.softmania.com/blocked'; // or show warning page
      }
    };

    window.addEventListener('resize', checkDevTools);
    return () => window.removeEventListener('resize', checkDevTools);
  }, []);



  const handleContactOption = (type: "call" | "whatsapp" | "email" | "schedule") => {
    switch (type) {
      case "call":
        window.open("tel:+919876543210", "_self")
        break
      case "whatsapp":
        window.open("https://wa.me/918317349618?text=Hi, I'm interested in Splunk Lab Environments", "_blank")
        break
      case "email":
        window.open("mailto:info@softmania.in?subject=Splunk Lab Environment Inquiry", "_self")
        break
      case "schedule":
        window.open("https://bookings.softmania.in/#/services", "_blank")
        break
    }
    setShowContactModal(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
       {/* Header */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-40 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between w-full">
           <Link href="/" passHref>
              <SoftmaniaLogo size="md" />
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 z-0">
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-green-50 border-green-500 transition-all duration-300 hover:scale-105 shadow-sm"
                onClick={() => router.push("/lab")}
              >
                <UserRoundCheck className="w-4 h-4 mr-2" />
                <span>{"MyLab"}</span>
              </Button>
            </div>

            {/* Right: Disclaimer and Contact Sales Buttons */}
            <div className="flex items-center space-x-3 z-10">
              <Dialog open={showDisclaimerModal} onOpenChange={setShowDisclaimerModal}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50 border-blue-500 transition-all duration-300 hover:scale-105 shadow-sm"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Disclaimer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-medium text-gray-900 mb-4">Important Disclaimer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <p className="text-gray-700 leading-relaxed text-base">
                        This lab provides infrastructure with pre-installed Splunk under its Free or Trial license. We
                        do not sell or resell Splunk software. All usage is subject to Splunk's official license terms.
                        This service is intended for educational and personal learning only.
                      </p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={() => setShowDisclaimerModal(false)}
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        I Understand
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContactModal(true)}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Contact Sales
            </Button>
            </div>
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <section className="py-8 sm:py-10 lg:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Splunk Lab Environments
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">
              Choose the perfect environment for your Splunk learning journey
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-[8px] italic">
              (For practice and learning purposes only — not for production use)
            </p>
          </div>
        </div>
      </section>


      {/* Environment Cards - All 3 in Same Style */}
      <section className="pb-12 sm:pb-16 lg:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {environments.map((env) => (
              <Card
                key={env.id}
                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
              >
                <CardHeader className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`p-3 rounded-xl ${env.bgColor} ${env.color} group-hover:scale-110 transition-transform duration-300`}
                    >
                      {env.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {env.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{env.subtitle}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{env.description}</p>
                      {selectedPricing[env.id] && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />₹{selectedPricing[env.id].amount} for{" "}
                          {selectedPricing[env.id].days} days
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-6">
                  {/* Features */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Key Features
                    </h3>
                    <div className="space-y-2">
                      {env.features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Components */}
                  {env.components && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4 text-green-600" />
                        Components
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {env.components.map((component, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs py-1 px-2 hover:scale-105 transition-transform duration-200"
                          >
                            {component}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Info
                    </h3>
                    <div className="space-y-2">
                      {env.info.map((info, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>{info}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Choose Package</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {env.pricing.map((option, index) => (
                        <div
                          key={index}
                          onClick={() => window.open(option.paymentLink, '_blank')}
                          className={`relative p-4 rounded-2xl border text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]
      ${selectedPricing[env.id]?.amount === option.amount
                              ? "border-green-500 bg-green-50 dark:bg-green-950/50 ring-1 ring-green-200 dark:ring-green-800 shadow-md"
                              : option.popular
                                ? "border-green-500 bg-green-50 dark:bg-green-950/50 shadow-sm"
                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                          {/* Selected Badge */}
                          {selectedPricing[env.id]?.amount === option.amount && (
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-green-600 text-white text-xs animate-pulse">
                                <CheckCircle className="w-2 h-2 mr-1" />
                                Selected
                              </Badge>
                            </div>
                          )}

                          {/* Popular Badge */}
                          {option.popular && selectedPricing[env.id]?.amount !== option.amount && (
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-green-600 text-white text-xs animate-bounce">
                                <Star className="w-2 h-2 mr-1" />
                                Popular
                              </Badge>
                            </div>
                          )}

                          {/* External Icon */}
                          <ArrowUpRightFromSquare className="absolute top-2 right-2 w-4 h-4 text-green-600 dark:text-gray-500" />

                          {/* Amount */}
                          <div className="text-lg font-bold text-gray-900 dark:text-white">₹{option.amount}</div>

                          {/* Hours */}
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            {option.hours} {option.hours === 1 ? "hour (2h/day)" : "hours (2h/day)"}
                          </div>

                          {/* Days Expiry – dynamically calculated or hardcoded */}
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            Approx. {Math.ceil(option.hours / 2)} days validity
                          </div>

                          {/* Open Link Button
                          <div className="mt-3">
                            <button
                              className="text-xs px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(option.paymentLink, '_blank');
                              }}
                            >
                              Pay
                            </button>
                          </div> */}
                        </div>
                      ))}

                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-lg mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
          <DialogHeader className="text-center pb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Contact Our Sales Team
            </DialogTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Choose your preferred way to connect with our Splunk experts
            </p>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-0">
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => handleContactOption("whatsapp")}
                className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 py-6 h-auto group transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <MessageCircle className="w-6 h-6 group-hover:animate-bounce" />
                <div className="text-center">
                  <div className="font-medium">WhatsApp</div>
                  <div className="text-xs opacity-90">Instant chat</div>
                </div>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleContactOption("email")}
                variant="outline"
                className="flex flex-col items-center gap-2 py-6 h-auto group transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                <Mail className="w-6 h-6 group-hover:animate-pulse" />
                <div className="text-center">
                  <div className="font-medium">Email Us</div>
                  <div className="text-xs opacity-70">Get details</div>
                </div>
              </Button>
              <Button
                onClick={() => handleContactOption("schedule")}
                variant="outline"
                className="flex flex-col items-center gap-2 py-6 h-auto group transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                <Calendar className="w-6 h-6 group-hover:animate-pulse" />
                <div className="text-center">
                  <div className="font-medium">Schedule</div>
                  <div className="text-xs opacity-70">Book meeting</div>
                </div>
              </Button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-6">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Headphones className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Expert Support Available</p>
                  {/* <p className="text-xs">Our Splunk certified team is ready to help you choose the right environment</p> */}
                </div>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setShowContactModal(false)} className="w-full mt-4">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12 dark:text-green-600 tracking-tight">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto dark:text-gray-800 tracking-tight">
            <Accordion type="single" collapsible className="w-full">

              {/* QUESTION 1 */}
              <AccordionItem value="can-onboard-own-data">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Can I onboard my own data source?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>You have full control over the rented servers.</li>
                    <li>You can onboard any of your own data sources.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 2 */}
              <AccordionItem value="live-data-sources">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Does this environment come with live data sources?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>Not yet, this feature is planned for future versions.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 3 */}
              <AccordionItem value="refund-policy">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Will I get a refund?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>No, refunds are not provided.</li>
                    <li>Server provisioning starts immediately after purchase.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 4 */}
              <AccordionItem value="has-es-itsi">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Does this environment include Splunk ES or ITSI?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>We provide only the free version of Splunk Enterprise.</li>
                    <li>You can install ES or ITSI using your own license (BYOL).</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 5 */}
              <AccordionItem value="what-is-this">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  What does this lab service provide?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>Hourly-based Splunk lab environments.</li>
                    <li>Preloaded datasets like BOTSv3.</li>
                    <li>Essential Splunk add-ons.</li>
                    <li>Standalone, distributed, or clustered setups.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 6 */}
              <AccordionItem value="who-is-this-for">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Who is this Splunk lab for?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>Beginners learning Splunk.</li>
                    <li>Certification exam preparation.</li>
                    <li>Professionals needing real-world practice.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 7 */}
              <AccordionItem value="support-available">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Is 24/7 support included?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>No, 24/7 support is not included.</li>
                    <li>Free basic course guidance is available.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 8 */}
              <AccordionItem value="demo-dataset">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  What demo data is included?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>BOTSv3 dataset for threat simulation.</li>
                    <li>Realistic logs for hands-on practice.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 9 */}
              <AccordionItem value="env-types">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Can I choose different types of environments?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>Yes, choose from:</li>
                    <li>Standalone</li>
                    <li>Non-clustered distributed</li>
                    <li>Clustered Splunk setups</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* QUESTION 10 */}
              <AccordionItem value="cert-prep">
                <AccordionTrigger className="text-gray-800 hover:text-green-600 transition-colors duration-200 font-medium text-base">
                  Is this lab suitable for certification practice?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-gray-600 pl-4 space-y-1">
                    <li>Yes, it’s perfect for practicing lab exercises and exam preparation.</li>
                    <li>Ideal for testing real-world Splunk scenarios.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

            </Accordion>


          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left Side: Logo + Copyright */}
            <div className="flex flex-col items-center sm:items-start gap-1 text-sm text-gray-600 dark:text-gray-400">
              <SoftmaniaLogo size="sm" />
              <p>© {new Date().getFullYear()} SoftMania. All rights reserved.</p>
            </div>

            {/* Right Side: Links */}
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="mt-2 flex justify-center space-x-4">
                <Link href="/privacy" passHref>
                  Privacy Policy
                </Link>
                <Link href="/terms" passHref>
                  Terms & Conditions
                </Link>
                <Link href="/refund" passHref>
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>

        </div>
      </footer>
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            ref={popupRef}
            className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 transition-all"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              aria-label="Close"
            >
              <span className="text-lg font-semibold">&times;</span>
            </button>

            {/* Title */}
            <h2 className="text-2xl font-semibold text-green-600 mb-3">Payment Successful!</h2>

            {/* Message */}
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


      <Salesiq />
    </div>
  )
}
