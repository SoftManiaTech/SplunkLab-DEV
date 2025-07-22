"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Database,
  Network,
  CheckCircle,
  Star,
  Check,
  ArrowUpRightFromSquare,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
} from "lucide-react"

interface EnvironmentOption {
  id: string
  title?: string
  subtitle?: string
  icon: React.ReactNode
  description?: string
  features: string[]
  info: string[]
  components?: string[]
  pricing: { amount: number; days?: number; hours: number; popular?: boolean; paymentLink: string }[]
  redirectUrl: string
  color: string
  bgColor: string
}

interface PricingCategory {
  id: string
  // Make category title optional
  title?: string
  description?: string
  environments: EnvironmentOption[]
}

interface LabPricingModelsProps {
  onPackageSelect: (env: EnvironmentOption, option: (typeof env.pricing)[0]) => void
  selectedPricing: Record<string, { amount: number; days: number }>
}

const pricingCategories: PricingCategory[] = [
  {
    id: "splunk-labs",
    environments: [
      {
        id: "standalone",
        title: " Splunk Standalone",
        subtitle: "Perfect for Learning",
        icon: <Server className="w-6 h-6" />,
        description: "Single instance with BOTSv3 dataset for hands-on security training and threat hunting practice.",
        features: [
          "Pre-configured Splunk instance (optional)",
          "BOTSv3 – Real-world logs with Splunk tutorial data. (optional)",
          "Supporting Add-ons for seamless data ingestion. (optional)",
        ],
        info: [
          "(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)",
          "Splunk Enterprise Version: 9.4.1",
          "Storage: 30GB",
          "Enabled ports: 22, 8000-9999",
          "Dynamic Public IP",
        ],
        components: ["Splunk Enterprise"],
        pricing: [
          { amount: 100, hours: 6, paymentLink: "https://pages.razorpay.com/Splunk-SE-100" },
          { amount: 200, hours: 14, paymentLink: "https://pages.razorpay.com/Splunk-SE-200" },
          { amount: 300, hours: 23, paymentLink: "https://pages.razorpay.com/Splunk-SE-300" },
          { amount: 400, hours: 31, paymentLink: "https://pages.razorpay.com/Splunk-SE-400" },
          { amount: 500, hours: 40, paymentLink: "https://pages.razorpay.com/Splunk-SE-500" },
        ],
        redirectUrl: "https://softmania.com/splunk-standalone-lab",
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/50",
      },
      {
        id: "distributed",
        title: "Splunk Distributed Non-Clustered",
        subtitle: "Scalable Architecture",
        icon: <Network className="w-6 h-6" />,
        description:
          "Multi-component architecture with search head, indexer, and forwarders for realistic deployments.",
        features: [
          "4-component architecture",
          "Distributed search capabilities",
          "BOTSv3 – Real-world logs with Splunk tutorial data. (optional)",
        ],
        info: [
          "(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)",
          "Splunk Enterprise Version: 9.4.1",
          "Storage: 30GB",
          "Enabled ports: 22, 8000-9999",
          "Dynamic Public IP",
        ],
        components: ["Search Head", "Indexer", "Heavy Forwarder", "Universal Forwarder"],
        pricing: [
          { amount: 200, hours: 3, paymentLink: "https://pages.razorpay.com/Splunk-DNC-200" },
          { amount: 500, hours: 10, paymentLink: "https://pages.razorpay.com/Splunk-DNC-500" },
          { amount: 1000, hours: 21, paymentLink: "https://pages.razorpay.com/Splunk-DNC-1000", popular: true },
          { amount: 1500, hours: 31, paymentLink: "https://pages.razorpay.com/Splunk-DNC-1500" },
        ],
        redirectUrl: "https://softmania.com/splunk-distributed-lab",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
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
          "Management server (Deployer, License manager, Deployment server, Monitoring Console)",
        ],
        info: [
          "(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)",
          "Splunk Enterprise Version: 9.4.1",
          "Storage: 30GB",
          "Enabled ports: 22, 8000-9999",
          "Dynamic Public IP",
        ],
        components: ["SH Cluster", "IDX Cluster", "Cluster Master", "HF", "Management server"],
        pricing: [
          { amount: 500, hours: 5, paymentLink: "https://pages.razorpay.com/Splunk-DC-500" },
          { amount: 1000, hours: 9, paymentLink: "https://pages.razorpay.com/Splunk-DC-1000" },
          { amount: 2000, hours: 19, paymentLink: "https://pages.razorpay.com/Splunk-DC-2000" },
          { amount: 3000, hours: 28, paymentLink: "https://pages.razorpay.com/Splunk-DC-3000", popular: true },
          { amount: 4000, hours: 38, paymentLink: "https://pages.razorpay.com/Splunk-DC-4000" },
          { amount: 5000, hours: 47, paymentLink: "https://pages.razorpay.com/Splunk-DC-5000" },
        ],
        redirectUrl: "https://softmania.com/splunk-cluster-lab",
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950/50",
      },
    ],
  },
  {
    id: "security-data-sources",
    title: "Security Data Sources",
    description: "Explore various security data sources for your Splunk use cases.",
    environments: [
      {
        id: "windows-event-logs",
        title: "Windows Event Logs",
        subtitle: "Comprehensive Windows Monitoring",
        icon: <FileText className="w-6 h-6" />,
        description: "Collect and analyze critical Windows event logs for security monitoring and incident response.",
        features: [
          "Security Event Logs (4624, 4625, etc.)",
          "System Event Logs",
          "Application Event Logs",
          "Forwarded Events",
        ],
        info: [
          "Requires Windows Server/Client",
          "Supports WinEventLog input in Splunk",
          "Recommended for endpoint security",
        ],
        components: ["Windows OS", "Universal Forwarder"],
        pricing: [
          { amount: 120, hours: 8, paymentLink: "https://pages.razorpay.com/WinLogs-DS-120" },
          { amount: 250, hours: 18, paymentLink: "https://pages.razorpay.com/WinLogs-DS-250" },
        ],
        redirectUrl: "https://softmania.com/windows-event-logs",
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
      },
      {
        id: "linux-syslogs",
        title: "Linux Syslogs",
        subtitle: "Linux Server Monitoring",
        icon: <ShieldCheck className="w-6 h-6" />,
        description: "Ingest and analyze Linux system logs for security, performance, and operational insights.",
        features: ["Auth logs (SSH, sudo)", "Kernel logs", "Cron job logs", "Package manager logs"],
        info: [
          "Compatible with various Linux distributions",
          "Supports syslog input in Splunk",
          "Essential for server security",
        ],
        components: ["Linux OS", "Universal Forwarder"],
        pricing: [
          { amount: 110, hours: 7, paymentLink: "https://pages.razorpay.com/LinuxLogs-DS-110" },
          { amount: 230, hours: 16, paymentLink: "https://pages.razorpay.com/LinuxLogs-DS-230" },
        ],
        redirectUrl: "https://softmania.com/linux-syslogs",
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/50",
      },
    ],
  },
]

export function LabPricingModels({ onPackageSelect, selectedPricing }: LabPricingModelsProps) {
  // State for managing expanded sections
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({})

  // Toggle functions for expanding/collapsing sections
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

  return (
    <section className="pb-12 sm:pb-16 lg:pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {pricingCategories.map((category) => (
          <div key={category.id} className="mb-12 sm:mb-16 lg:mb-20">
            <div className="text-center mb-8 sm:mb-12">
              {/* Conditional rendering for category title */}
              {category.title && (
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">{category.title}</h2>
              )}
              {category.description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{category.description}</p>
              )}
            </div>
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              {category.environments.length > 0 ? (
                category.environments.map((env) => (
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
                          {/* Conditional rendering for card title */}
                          {env.title && (
                            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                              {env.title}
                            </CardTitle>
                          )}
                          {/* Conditional rendering for card subtitle */}
                          {env.subtitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{env.subtitle}</p>
                          )}
                          {/* Conditional rendering for card description */}
                          {env.description && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {env.description}
                            </p>
                          )}
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
                      {/* Features - Show all without See More */}
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

                      {/* Info with Dropdown Arrow */}
                      <div>
                        <button
                          onClick={() => toggleInfo(env.id)}
                          className="w-full text-left flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white mb-3 hover:text-green-600 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            Info
                          </div>
                          {expandedInfo[env.id] ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>

                        {expandedInfo[env.id] && (
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
                        )}
                      </div>

                      {/* Pricing */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Choose Package</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {env.pricing.map((option, index) => (
                            <div
                              key={index}
                              onClick={() => onPackageSelect(env, option)}
                              className={`relative p-4 rounded-2xl border text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]
    ${
      selectedPricing[env.id]?.amount === option.amount
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
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="lg:col-span-3 text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    No services available in this category yet. Check back soon!
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Export the pricingCategories data for use in parent component
export { pricingCategories }
export type { EnvironmentOption, PricingCategory }
