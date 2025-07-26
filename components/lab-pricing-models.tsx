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
  FileText,
  Terminal,
  Users,
  MessageSquare,
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
          { amount: 500, hours: 40, paymentLink: "https://pages.razorpay.com/Splunk-SE-500", popular: true },
          { amount: 600, hours: 48, paymentLink: "https://pages.razorpay.com/Splunk-SE-600" },
          { amount: 700, hours: 56, paymentLink: "https://pages.razorpay.com/Splunk-SE-700" },
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
          { amount: 2000, hours: 42, paymentLink: "https://pages.razorpay.com/Splunk-DNC-2000" },
          { amount: 2500, hours: 52, paymentLink: "https://pages.razorpay.com/Splunk-DNC-2500" },
          { amount: 2800, hours: 58, paymentLink: "https://pages.razorpay.com/Splunk-DNC-2800" },
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
          { amount: 6000, hours: 56, paymentLink: "https://pages.razorpay.com/Splunk-DC-6000" },
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
      // {
      //   id: "windows-ad-dns",
      //   title: "Windows (AD & DNS)",
      //   subtitle: "Active Directory & DNS Security",
      //   icon: <Users className="w-6 h-6" />,
      //   description:
      //     "Monitor Active Directory and DNS server logs for authentication, authorization, and network resolution activities.",
      //   features: ["Active Directory audit logs", "DNS query logs", "Group policy changes", "User logon/logoff events"],
      //   info: [
      //     "Requires Windows Server (Domain Controller, DNS Server)",
      //     "Supports WinEventLog input in Splunk",
      //     "Essential for identity and network security",
      //   ],
      //   components: ["Windows Server (DC)", "DNS Server", "Universal Forwarder"],
      //   pricing: [
      //     { amount: 160, hours: 12, paymentLink: "https://pages.razorpay.com/WinADDNS-DS-160" },
      //     { amount: 330, hours: 24, paymentLink: "https://pages.razorpay.com/WinADDNS-DS-330" },
      //   ],
      //   redirectUrl: "https://softmania.com/windows-ad-dns-logs",
      //   color: "text-indigo-600",
      //   bgColor: "bg-indigo-50 dark:bg-indigo-950/50",
      // },
      // {
      //   id: "linux-data-sources",
      //   title: "Linux",
      //   subtitle: "Comprehensive Linux Monitoring",
      //   icon: <Terminal className="w-6 h-6" />,
      //   description: "Collect various Linux data beyond just syslogs, including audit logs, process data, and more.",
      //   features: ["Audit logs", "Process monitoring", "File integrity monitoring", "Performance metrics"],
      //   info: ["Requires Linux OS", "Supports various Splunk inputs", "Crucial for host-based security"],
      //   components: ["Linux OS", "Universal Forwarder", "Auditd"],
      //   pricing: [
      //     { amount: 130, hours: 9, paymentLink: "https://pages.razorpay.com/LinuxData-DS-130" },
      //     { amount: 270, hours: 19, paymentLink: "https://pages.razorpay.com/LinuxData-DS-270" },
      //   ],
      //   redirectUrl: "https://softmania.com/linux-data-sources",
      //   color: "text-purple-600",
      //   bgColor: "bg-purple-50 dark:bg-purple-950/50",
      // },
      {
        id: "syslog-ng",
        title: "Syslog-ng",
        subtitle: "Advanced Syslog Collection",
        icon: <MessageSquare className="w-6 h-6" />,
        description: "Collect and analyze logs from Syslog-ng for robust and flexible log management.",
        features: [
          "Syslog-ng is installed and configured on a Linux host",
          "Logs are forwarded to a Splunk indexer via TCP (port 9997)",
          "Custom templates are used to format the logs for ingestion",
        ],
        info: [
          "(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)",
          "Storage: 30GB",
          "Enabled ports: 22, 80, 443, 514, 5514",
          "Dynamic Public IP",
        ],
        components: ["Syslog-ng Server"],
        pricing: [
          { amount: 100, hours: 6, paymentLink: "https://pages.razorpay.com/syslog-100" },
          { amount: 200, hours: 14, paymentLink: "https://pages.razorpay.com/syslog-200" },
          { amount: 300, hours: 23, paymentLink: "https://pages.razorpay.com/syslog-300" },
          { amount: 400, hours: 31, paymentLink: "https://pages.razorpay.com/syslog-400" },
          { amount: 500, hours: 40, paymentLink: "https://pages.razorpay.com/syslog-500" },
          { amount: 600, hours: 48, paymentLink: "https://pages.razorpay.com/syslog-600" },
          { amount: 700, hours: 56, paymentLink: "https://pages.razorpay.com/syslog-700" },
        ],
        redirectUrl: "https://softmania.com/syslog-ng-data-source",
        color: "text-cyan-600",
        bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
      },
      {
        id: "mysql-logs",
        title: "MySQL Database",
        subtitle: "Database Activity Monitoring",
        icon: <Database className="w-6 h-6" />,
        description:
          "Monitor MySQL database activity, including queries, errors, and audit trails for security and performance.",
        features: ["General query logs", "Error logs", "Slow query logs", "Audit logs (if enabled)"],
        info: ["Requires MySQL server", "Supports database inputs/scripts in Splunk", "Important for data security"],
        components: ["MySQL Server", "Universal Forwarder"],
        pricing: [
          { amount: 100, hours: 6, paymentLink: "https://pages.razorpay.com/mysql-100" },
          { amount: 200, hours: 14, paymentLink: "https://pages.razorpay.com/mysql-200" },
          { amount: 300, hours: 23, paymentLink: "https://pages.razorpay.com/mysql-300" },
          { amount: 400, hours: 31, paymentLink: "https://pages.razorpay.com/mysql-400" },
          { amount: 500, hours: 40, paymentLink: "https://pages.razorpay.com/mysql-500" },
          { amount: 600, hours: 48, paymentLink: "https://pages.razorpay.com/mysql-600" },
          { amount: 700, hours: 56, paymentLink: "https://pages.razorpay.com/mysql-700" },
        ],
        redirectUrl: "https://softmania.com/mysql-logs",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
      },
      {
        id: "mssql-logs",
        title: "MSSQL Database",
        subtitle: "SQL Server Monitoring",
        icon: <Database className="w-6 h-6" />,
        description:
          "Collect and analyze logs from Microsoft SQL Server for security, compliance, and performance insights.",
        features: ["SQL Server audit logs", "Error logs", "SQL Agent logs", "Trace logs"],
        info: [
          "Requires MSSQL Server",
          "Supports database inputs/scripts in Splunk",
          "Critical for enterprise databases",
        ],
        components: ["MSSQL Server", "Universal Forwarder"],
        pricing: [
          { amount: 200, hours: 6, paymentLink: "https://pages.razorpay.com/mssql-200" },
          { amount: 400, hours: 14, paymentLink: "https://pages.razorpay.com/mssql-400" },
          { amount: 600, hours: 23, paymentLink: "https://pages.razorpay.com/mssql-600" },
          { amount: 800, hours: 31, paymentLink: "https://pages.razorpay.com/mssql-800" },
          { amount: 1000, hours: 40, paymentLink: "https://pages.razorpay.com/mssql-1000" },
          { amount: 1200, hours: 48, paymentLink: "https://pages.razorpay.com/mssql-1200" },
          { amount: 1400, hours: 56, paymentLink: "https://pages.razorpay.com/mssql-1400" },
        ],
        redirectUrl: "https://softmania.com/mssql-logs",
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950/50",
      },
      {
        id: "ossec",
        title: "OSSEC",
        subtitle: "Host-based Intrusion Detection",
        icon: <FileText className="w-6 h-6" />,
        description:
          "Deploy and monitor OSSEC HIDS for real-time log analysis, file integrity checking, and rootkit detection.",
        features: [
          "Log analysis and correlation",
          "File integrity monitoring (FIM)",
          "Rootkit detection",
          "Active response capabilities",
        ],
        info: [
          "(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)",
          "OSSEC Server and Agent setup",
          "Integration with Splunk for centralized logging",
          "Dynamic Public IP",
        ],
        components: ["OSSEC Server", "OSSEC Agent", "Universal Forwarder"],
        pricing: [
          { amount: 100, hours: 6, paymentLink: "https://pages.razorpay.com/ossec-100" },
          { amount: 200, hours: 14, paymentLink: "https://pages.razorpay.com/ossec-200" },
          { amount: 300, hours: 23, paymentLink: "https://pages.razorpay.com/ossec-300" },
          { amount: 400, hours: 31, paymentLink: "https://pages.razorpay.com/ossec-400" },
          { amount: 500, hours: 40, paymentLink: "https://pages.razorpay.com/ossec-500" },
          { amount: 600, hours: 48, paymentLink: "https://pages.razorpay.com/ossec-600" },
          { amount: 700, hours: 56, paymentLink: "https://pages.razorpay.com/ossec-700" },
        ],
        redirectUrl: "https://softmania.com/ossec-hids-data-source",
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/50",
      },
      {
        id: "jenkins",
        title: "Jenkins CI/CD",
        subtitle: "DevOps Pipeline Monitoring",
        icon: <Terminal className="w-6 h-6" />,
        description:
          "Monitor Jenkins build and deployment logs for insights into your CI/CD pipeline's performance and security.",
        features: [
          "Jenkins server setup",
          "Build logs collection",
          "Deployment status monitoring",
          "User activity tracking",
        ],
        info: [
          "(OS: Red Hat-9) (RAM: 4 GB) (vCPUs: 2)",
          "Jenkins LTS Version",
          "Integration with Splunk for CI/CD observability",
          "Dynamic Public IP",
        ],
        components: ["Jenkins Server", "Universal Forwarder"],
        pricing: [
          { amount: 100, hours: 6, paymentLink: "https://pages.razorpay.com/jenkins-100" },
          { amount: 200, hours: 14, paymentLink: "https://pages.razorpay.com/jenkins-200" },
          { amount: 300, hours: 23, paymentLink: "https://pages.razorpay.com/jenkins-300" },
          { amount: 400, hours: 31, paymentLink: "https://pages.razorpay.com/jenkins-400" },
          { amount: 500, hours: 40, paymentLink: "https://pages.razorpay.com/jenkins-500" },
          { amount: 600, hours: 48, paymentLink: "https://pages.razorpay.com/jenkins-600" },
          { amount: 700, hours: 56, paymentLink: "https://pages.razorpay.com/jenkins-700" },
        ],
        redirectUrl: "https://softmania.com/jenkins-ci-cd-data-source",
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
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
                    className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group hover:border-green-500"
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
