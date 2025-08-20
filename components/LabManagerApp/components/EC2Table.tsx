"use client"

import React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import axios from "axios"
import {
  Copy,
  Loader2,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Key,
  Eye,
  EyeOff,
  Database,
  Play,
  AlertCircle,
  MessageCircle,
  CheckCircle,
} from "lucide-react"
import { logToSplunk } from "@/lib/splunklogger"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface EC2Instance {
  Name: string
  InstanceId: string
  State: string
  PrivateIp: string
  PublicIp: string
  SSHCommand: string
  Region: string
  ServiceType: string
  PublicIpAddress?: string
}

interface ClusterInstance {
  InstanceId: string
  Name: string
  State: string
  PublicIpAddress?: string
  PrivateIpAddress?: string
}

interface SplunkValidationResult {
  ip: string
  status: "UP" | "DOWN"
  details: string
}

interface EC2TableProps {
  email: string
  instances: EC2Instance[]
  setInstances: React.Dispatch<React.SetStateAction<EC2Instance[]>>
  loading: boolean
  rawUsageSummary: any[]
  fetchUsageSummary: () => Promise<void>
  isRefreshingUsage: boolean
  hasLab: boolean
  onPasswordModalOpenChange?: (isOpen: boolean) => void
}

const MAX_PASSWORD_CLICKS = 5
const PASSWORD_RESET_INTERVAL_MS = 20 * 60 * 1000

const EC2Table: React.FC<EC2TableProps> = ({
  email,
  instances,
  setInstances,
  loading,
  rawUsageSummary,
  fetchUsageSummary,
  isRefreshingUsage,
  hasLab,
  onPasswordModalOpenChange,
}) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL as string

  const [disabledButtons, setDisabledButtons] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [showExpiryColumn, setShowExpiryColumn] = useState<Record<string, boolean>>({})
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [expandedUsageRows, setExpandedUsageRows] = useState<Record<string, boolean>>({})
  const [expandedCredentials, setExpandedCredentials] = useState<Record<string, boolean>>({})
  const [stableTooltips, setStableTooltips] = useState<Record<string, string>>({})

  // State for password modal
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    loading: false,
    error: null as string | null,
    details: null as {
      username: string
      password: string
      publicIp?: string
    } | null,
  })

  // Password rate limiting state
  const [passwordClickCount, setPasswordClickCount] = useState(0)
  const [passwordLastResetTime, setPasswordLastResetTime] = useState<number>(Date.now())
  const [isPasswordRateLimited, setIsPasswordRateLimited] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  // Cluster configuration modal state
  const [clusterConfigModal, setClusterConfigModal] = useState({
    isOpen: false,
    loading: false,
    error: null as string | null,
    success: false,
    username: "",
    email: "",
    editableUsername: false,
    startingInstances: false,
    checkingLicense: false,
    licenseError: null as string | null,
    needsLicenseUpload: false,
    managementServerNotFound: false,
    stoppedInstances: [] as any[],
    splunkValidationTimer: 0,
    splunkValidationInProgress: false,
    splunkValidationResults: null as any,
    showProceedAfterTimer: false,
  })

  // Specific cluster instance freeze state (instead of global)
  const [frozenClusterInstances, setFrozenClusterInstances] = useState<Record<string, number>>({}) // instanceId -> endTime
  const [frozenClusterRemainingTimes, setFrozenClusterRemainingTimes] = useState<Record<string, number>>({})

  // Extend validity modal state
  const [extendValidityModal, setExtendValidityModal] = useState({
    isOpen: false,
    instanceId: "",
    instanceName: "",
    endDate: "",
  })

  // Helper function to format milliseconds into MM:SS
  const formatRemainingTime = useCallback((ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }, [])

  // Function to get expiry date for an instance
  const getInstanceExpiryDate = (instanceId: string): string => {
    for (const summary of rawUsageSummary) {
      if (summary.InstanceIds && summary.InstanceIds.includes(instanceId)) {
        return summary.PlanEndDate || "N/A"
      }
    }
    return "N/A"
  }

  // Function to get usage details for an instance
  const getInstanceUsageDetails = (instanceId: string) => {
    for (const summary of rawUsageSummary) {
      if (summary.InstanceIds && summary.InstanceIds.includes(instanceId)) {
        return {
          quota_hours: summary.QuotaHours || 0,
          used_hours: summary.ConsumedHours || 0,
          balance_hours: summary.BalanceHours || 0,
          quota_days: summary.QuotaExpiryDays || 0,
          used_days: summary.ConsumedDays || 0,
          balance_days: summary.BalanceDays || 0,
          plan_start_date: summary.PlanStartDate || "",
          plan_end_date: summary.PlanEndDate || "",
        }
      }
    }
    return null
  }

  // Function to toggle usage details expansion
  const toggleUsageDetails = useCallback((instanceId: string) => {
    setExpandedUsageRows((prev) => ({
      ...prev,
      [instanceId]: !prev[instanceId],
    }))
  }, [])

  // Helper function to check if instances match cluster pattern
  const isClusterInstance = (instanceName: string) => {
    const clusterPatterns = ["ClusterMaster", "idx1", "idx2", "idx3", "Management_server", "IF", "SH1", "SH2", "SH3"]
    return clusterPatterns.some((pattern) => instanceName.includes(pattern))
  }

  // Helper function to extract username from instance name
  const extractUsernameFromInstance = (instanceName: string) => {
    const patterns = ["ClusterMaster", "idx1", "idx2", "idx3", "Management_server", "IF", "SH1", "SH2", "SH3"]

    for (const pattern of patterns) {
      if (instanceName.includes(`-${pattern}`)) {
        return instanceName.split(`-${pattern}`)[0]
      }
    }
    return instanceName.split("-")[0]
  }

  // Helper function to check if service type has complete cluster set
  const hasCompleteClusterSet = (serviceInstances: EC2Instance[]) => {
    const requiredPatterns = ["ClusterMaster", "idx1", "idx2", "idx3", "Management_server", "IF", "SH1", "SH2", "SH3"]

    // Get all usernames from cluster instances
    const usernames = new Set<string>()
    serviceInstances.forEach((inst) => {
      if (isClusterInstance(inst.Name)) {
        usernames.add(extractUsernameFromInstance(inst.Name))
      }
    })

    // Check if any username has all required patterns
    for (const username of usernames) {
      const userInstances = serviceInstances.filter((inst) => inst.Name.startsWith(username))
      const foundPatterns = userInstances
        .map((inst) => {
          for (const pattern of requiredPatterns) {
            if (inst.Name.includes(`-${pattern}`)) {
              return pattern
            }
          }
          return null
        })
        .filter(Boolean)

      if (requiredPatterns.every((pattern) => foundPatterns.includes(pattern))) {
        return { hasComplete: true, username }
      }
    }

    return { hasComplete: false, username: null }
  }

  // Helper function to get cluster instances for a specific username
  const getClusterInstancesForUsername = useCallback(
    (username: string) => {
      return instances.filter((inst) => inst.Name.startsWith(username) && isClusterInstance(inst.Name))
    },
    [instances],
  )

  // Helper function to check if instance is frozen
  const isInstanceFrozen = useCallback(
    (instanceId: string) => {
      const endTime = frozenClusterInstances[instanceId]
      if (!endTime) return false
      return Date.now() < endTime
    },
    [frozenClusterInstances],
  )

  // Helper function to calculate notification dot urgency
  const getNotificationUrgency = (instanceId: string) => {
    const usageDetails = getInstanceUsageDetails(instanceId)
    if (!usageDetails) return null

    const now = new Date()
    const endDate = new Date(usageDetails.plan_end_date)
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const usagePercentage = (usageDetails.used_hours / usageDetails.quota_hours) * 100

    // Check if we should show notification (2 days before end OR 80% usage)
    const shouldShowByDate = daysUntilEnd <= 2 && daysUntilEnd >= 0
    const shouldShowByUsage = usagePercentage >= 80

    if (!shouldShowByDate && !shouldShowByUsage) return null

    // Determine urgency level
    const isHighUrgency = daysUntilEnd <= 1 || usagePercentage >= 90

    return {
      level: isHighUrgency ? "high" : "medium",
      daysUntilEnd,
      usagePercentage: Math.round(usagePercentage),
      endDate: usageDetails.plan_end_date,
    }
  }

  // Helper function to get notification tooltip text
  const getNotificationTooltip = (urgency: any) => {
    if (!urgency) return ""

    const messages = []
    if (urgency.daysUntilEnd <= 2 && urgency.daysUntilEnd >= 0) {
      messages.push(`Quota expires in ${urgency.daysUntilEnd} day${urgency.daysUntilEnd !== 1 ? "s" : ""}`)
    }
    if (urgency.usagePercentage >= 80) {
      messages.push(`${urgency.usagePercentage}% quota used`)
    }

    return `${messages.join(" • ")} - Click to extend validity`
  }

  // Helper function to handle extend validity
  const handleExtendValidity = (instanceId: string, instanceName: string) => {
    const usageDetails = getInstanceUsageDetails(instanceId)
    setExtendValidityModal({
      isOpen: true,
      instanceId,
      instanceName,
      endDate: usageDetails?.plan_end_date || "",
    })
  }

  // Helper function to validate Splunk license via proxy
  const validateSplunkLicense = useCallback(
    async (username: string) => {
      try {
        // Find the Management_server instance
        const managementServer = instances.find(
          (inst) => inst.Name.includes(`${username}-Management_server`) && inst.ServiceType === "Splunk",
        )

        if (!managementServer || !managementServer.PublicIp) {
          throw new Error("Management server not found or doesn't have a public IP")
        }

        // Check if Management_server is running
        if (managementServer.State !== "running") {
          throw new Error("Management server is not running. Please start it first.")
        }

        // Use our backend proxy to handle HTTPS certificate issues
        const response = await fetch("/api/lab-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": email,
          },
          body: JSON.stringify({
            path: "/validate-splunk-license",
            method: "POST",
            body: {
              management_server_ip: managementServer.PublicIp,
              username: "admin",
              password: "admin123",
            },
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to connect to Management server: ${response.status}`)
        }

        const data = await response.json()

        if (data.message === "Internal Server Error") {
          throw new Error("Internal Server Error occurred. Please try again.")
        }

        // Check the status field for different license states
        if (data.status === "Splunk Enterprise Trial free account") {
          return { valid: false, needsLicenseUpload: true, needsRestart: false }
        }

        if (data.status === "Splunk License updated") {
          return { valid: true, needsLicenseUpload: false, needsRestart: false }
        }

        // For any other status, assume license needs to be uploaded
        return { valid: false, needsLicenseUpload: true, needsRestart: false }
      } catch (error) {
        console.error("License validation error:", error)
        throw error
      }
    },
    [instances, email],
  )

  const fetchInstances = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await axios.get(`${apiUrl}/instances`, {
        headers: { Authorization: `Bearer ${email}` },
      })
      setInstances(res.data)

      await logToSplunk({
        session: email,
        action: "lab_instance_refresh",
        details: { total_instances: res.data.length },
      })
    } catch (error) {
      console.error("Error fetching instances:", error)
    } finally {
      setRefreshing(false)
    }
  }, [apiUrl, email, setInstances])

  const fetchFreshInstanceData = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/instances`, {
        headers: { Authorization: `Bearer ${email}` },
      })
      return res.data
    } catch (error) {
      console.error("Error fetching instances:", error)
      return []
    }
  }, [apiUrl, email])

  const validateSplunkInstallation = useCallback(
    async (username: string) => {
      try {
        // Get fresh instance data
        const freshInstances = await fetchFreshInstanceData()
        const clusterInstances = freshInstances.filter(
          (inst: ClusterInstance) => inst.Name && inst.Name.toLowerCase().includes(username.toLowerCase()),
        )

        const runningInstances = clusterInstances.filter(
          (inst: ClusterInstance) => inst.State && inst.State.toLowerCase() === "running",
        )

        if (runningInstances.length === 0) {
          const currentStates = clusterInstances
            .map((inst: ClusterInstance) => `${inst.Name}: ${inst.State}`)
            .join(", ")
          throw new Error(`No running servers found for Splunk validation. Current states: ${currentStates}`)
        }

        const publicIps = runningInstances
          .map((inst: ClusterInstance) => inst.PublicIpAddress)
          .filter((ip): ip is string => Boolean(ip && ip.trim()))

        if (publicIps.length === 0) {
          const serverNames = runningInstances.map((inst: ClusterInstance) => inst.Name).join(", ")
          throw new Error(`No public IPs found for running servers: ${serverNames}`)
        }

        console.log("[v0] Calling /splunk-validate with public IPs:", publicIps)

        const response = await fetch("/api/lab-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": email,
          },
          body: JSON.stringify({
            path: "/splunk-validate",
            method: "POST",
            body: {
              public_ips: publicIps,
            },
          }),
        })

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] Splunk validation response:", data)

        return { success: true, results: data.results, instances: runningInstances }
      } catch (error) {
        console.error("Splunk validation error:", error)
        throw error
      }
    },
    [email, fetchFreshInstanceData],
  )

  const proceedToLicenseValidation = useCallback(async () => {
    setClusterConfigModal((prev) => ({
      ...prev,
      loading: true,
      checkingLicense: true,
      error: null,
    }))

    try {
      // Call the license validation
      const licenseValidation = await validateSplunkLicense(clusterConfigModal.username)

      if (licenseValidation.valid) {
        setClusterConfigModal((prev) => ({
          ...prev,
          loading: false,
          checkingLicense: false,
          success: true,
          error: null,
        }))
      } else if (licenseValidation.needsLicenseUpload) {
        setClusterConfigModal((prev) => ({
          ...prev,
          loading: false,
          checkingLicense: false,
          needsLicenseUpload: true,
          error: "License upload required for this cluster configuration.",
        }))
      } else {
        setClusterConfigModal((prev) => ({
          ...prev,
          loading: false,
          checkingLicense: false,
          error: "License validation failed. Please check your cluster configuration.",
        }))
      }
    } catch (error) {
      console.error("License validation error:", error)
      setClusterConfigModal((prev) => ({
        ...prev,
        loading: false,
        checkingLicense: false,
        error: error instanceof Error ? error.message : "License validation failed. Please try again.",
      }))
    }
  }, [clusterConfigModal.username, validateSplunkLicense])

  const handleClusterConfigSubmit = useCallback(async () => {
    setClusterConfigModal((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
      splunkValidationInProgress: false,
      splunkValidationResults: null,
      showProceedAfterTimer: false,
    }))

    try {
      // First, get fresh instance data to check server states
      const freshInstances = await fetchFreshInstanceData()
      const clusterInstances = freshInstances.filter(
        (inst: ClusterInstance) =>
          inst.Name && inst.Name.toLowerCase().includes(clusterConfigModal.username.toLowerCase()),
      )

      const stoppedInstances = clusterInstances.filter(
        (inst: ClusterInstance) => inst.State && inst.State.toLowerCase() !== "running",
      )

      // If there are stopped instances, show them and allow starting
      if (stoppedInstances.length > 0) {
        setClusterConfigModal((prev) => ({
          ...prev,
          loading: false,
          stoppedInstances,
          managementServerNotFound: true,
          error: `Please start all cluster servers before configuring the cluster.`,
        }))
        return
      }

      // All servers are running, proceed with Splunk validation
      setClusterConfigModal((prev) => ({
        ...prev,
        splunkValidationInProgress: true,
      }))

      const splunkValidation = await validateSplunkInstallation(clusterConfigModal.username)

      // Check if all servers have Splunk installed
      const downServers = splunkValidation.results.filter((result: SplunkValidationResult) => result.status === "DOWN")

      if (downServers.length > 0) {
        const downServerDetails = downServers
          .map((server: SplunkValidationResult) => {
            const instance = splunkValidation.instances.find(
              (inst: ClusterInstance) => inst.PublicIpAddress === server.ip,
            )
            return `${instance?.Name || server.ip}: Splunk not installed`
          })
          .join(", ")

        setClusterConfigModal((prev) => ({
          ...prev,
          loading: false,
          splunkValidationInProgress: false,
          error: `Splunk installation required on: ${downServerDetails}`,
        }))
        return
      }

      // All servers have Splunk installed, start 15-second timer
      setClusterConfigModal((prev) => ({
        ...prev,
        loading: false,
        splunkValidationInProgress: false,
        splunkValidationResults: splunkValidation.results,
        splunkValidationTimer: 15,
      }))

      // Start countdown timer
      const timer = setInterval(() => {
        setClusterConfigModal((prev) => {
          if (prev.splunkValidationTimer <= 1) {
            clearInterval(timer)
            return {
              ...prev,
              splunkValidationTimer: 0,
              showProceedAfterTimer: true,
            }
          }
          return {
            ...prev,
            splunkValidationTimer: prev.splunkValidationTimer - 1,
          }
        })
      }, 1000)
    } catch (error) {
      console.error("Cluster configuration error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to configure cluster. Please try again."

      setClusterConfigModal((prev) => ({
        ...prev,
        loading: false,
        splunkValidationInProgress: false,
        error: errorMessage,
        success: false,
      }))
    }
  }, [clusterConfigModal.username, clusterConfigModal.email, email, validateSplunkInstallation, fetchFreshInstanceData])

  // Effect to manage expanded states
  useEffect(() => {
    setExpandedRows((prevExpandedRows) => {
      const newExpandedRows = { ...prevExpandedRows }
      const currentInstanceIds = new Set(instances.map((inst) => inst.InstanceId))

      for (const instanceId in newExpandedRows) {
        if (!currentInstanceIds.has(instanceId)) {
          delete newExpandedRows[instanceId]
        }
      }

      instances.forEach((instance) => {
        const shouldBeExpandedByDefault =
          (instance.ServiceType === "DataSources" &&
            ["MYSQL", "Jenkins", "MSSQL", "OSSEC", "OpenVPN"].includes(instance.Name)) ||
          (instance.ServiceType !== "DataSources" && ["MYSQL", "Jenkins", "MSSQL", "OSSEC"].includes(instance.Name))

        if (shouldBeExpandedByDefault && newExpandedRows[instance.InstanceId] !== false) {
          newExpandedRows[instance.InstanceId] = true
        }
      })
      return newExpandedRows
    })

    setExpandedCredentials((prevExpandedCredentials) => {
      const newExpandedCredentials = { ...prevExpandedCredentials }
      const currentInstanceIds = new Set(instances.map((inst) => inst.InstanceId))

      for (const instanceId in newExpandedCredentials) {
        if (!currentInstanceIds.has(instanceId)) {
          delete newExpandedCredentials[instanceId]
        }
      }

      instances.forEach((instance) => {
        const shouldBeExpandedByDefault =
          (instance.ServiceType === "DataSources" &&
            ["MYSQL", "Jenkins", "MSSQL", "OSSEC", "OpenVPN"].includes(instance.Name)) ||
          (instance.ServiceType !== "DataSources" && ["MYSQL", "Jenkins", "MSSQL", "OSSEC"].includes(instance.Name))

        if (shouldBeExpandedByDefault && newExpandedCredentials[instance.InstanceId] !== false) {
          newExpandedCredentials[instance.InstanceId] = true
        }
      })
      return newExpandedCredentials
    })

    setExpandedUsageRows((prevExpandedUsageRows) => {
      const newExpandedUsageRows = { ...prevExpandedUsageRows }
      const currentInstanceIds = new Set(instances.map((inst) => inst.InstanceId))

      for (const instanceId in newExpandedUsageRows) {
        if (!currentInstanceIds.has(instanceId)) {
          delete newExpandedUsageRows[instanceId]
        }
      }
      return newExpandedUsageRows
    })
  }, [instances])

  // Load password click state from localStorage on mount
  useEffect(() => {
    const storedCount = localStorage.getItem(`${email}-passwordClickCount`)
    const storedTime = localStorage.getItem(`${email}-passwordLastResetTime`)

    const now = Date.now()

    if (storedCount && storedTime) {
      const count = Number.parseInt(storedCount, 10)
      const time = Number.parseInt(storedTime, 10)

      if (now - time < PASSWORD_RESET_INTERVAL_MS) {
        setPasswordClickCount(count)
        setPasswordLastResetTime(time)
        if (count >= MAX_PASSWORD_CLICKS) {
          setIsPasswordRateLimited(true)
        }
        setRemainingTime(time + PASSWORD_RESET_INTERVAL_MS - now)
      } else {
        localStorage.removeItem(`${email}-passwordClickCount`)
        localStorage.removeItem(`${email}-passwordLastResetTime`)
        setPasswordClickCount(0)
        setPasswordLastResetTime(now)
        setIsPasswordRateLimited(false)
        setRemainingTime(0)
      }
    } else {
      setPasswordClickCount(0)
      setPasswordLastResetTime(now)
      setIsPasswordRateLimited(false)
      setRemainingTime(0)
    }
  }, [email])

  // Set up interval for automatic password click reset and remaining time update
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const resetTargetTime = passwordLastResetTime + PASSWORD_RESET_INTERVAL_MS
      const timeUntilReset = resetTargetTime - now

      if (timeUntilReset <= 0) {
        setPasswordClickCount(0)
        setPasswordLastResetTime(now)
        setIsPasswordRateLimited(false)
        setRemainingTime(0)
        localStorage.removeItem(`${email}-passwordClickCount`)
        localStorage.removeItem(`${email}-passwordLastResetTime`)
      } else {
        setRemainingTime(timeUntilReset)
        if (passwordClickCount >= MAX_PASSWORD_CLICKS && !isPasswordRateLimited) {
          setIsPasswordRateLimited(true)
        }
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [passwordClickCount, passwordLastResetTime, isPasswordRateLimited, email])

  // Load frozen cluster instances from localStorage
  useEffect(() => {
    const savedFrozenInstances = localStorage.getItem(`cluster-freeze-instances-${email}`)
    if (savedFrozenInstances) {
      try {
        const parsed = JSON.parse(savedFrozenInstances)
        const now = Date.now()
        const validFrozen: Record<string, number> = {}

        // Filter out expired frozen instances
        Object.entries(parsed).forEach(([instanceId, endTime]) => {
          if (now < (endTime as number)) {
            validFrozen[instanceId] = endTime as number
          }
        })

        setFrozenClusterInstances(validFrozen)
      } catch (error) {
        console.error("Error loading frozen cluster instances:", error)
      }
    }
  }, [email])

  // Timer for frozen cluster instances
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updatedFrozen: Record<string, number> = {}
      const updatedRemainingTimes: Record<string, number> = {}
      let hasChanges = false

      Object.entries(frozenClusterInstances).forEach(([instanceId, endTime]) => {
        const remaining = endTime - now
        if (remaining > 0) {
          updatedFrozen[instanceId] = endTime
          updatedRemainingTimes[instanceId] = remaining
        } else {
          hasChanges = true
        }
      })

      if (hasChanges) {
        setFrozenClusterInstances(updatedFrozen)
        localStorage.setItem(`cluster-freeze-instances-${email}`, JSON.stringify(updatedFrozen))
      }

      setFrozenClusterRemainingTimes(updatedRemainingTimes)
    }, 1000)

    return () => clearInterval(interval)
  }, [frozenClusterInstances, email])

  const isCooldown = (instanceId: string, action: string) =>
    disabledButtons[`${instanceId}_${action}`] || isInstanceFrozen(instanceId)

  const handleButtonClick = async (action: string, instanceId: string) => {
    if (isInstanceFrozen(instanceId)) return

    const key = `${instanceId}_${action}`
    setDisabledButtons((prev) => ({ ...prev, [key]: true }))
    setLoadingAction(key)

    await callAction(action, instanceId)

    setTimeout(() => {
      setDisabledButtons((prev) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
      setLoadingAction(null)
    }, 5000)
  }

  const handleBulkAction = async (action: string) => {
    if (selectedInstances.size === 0) return

    // Check if any selected instances are frozen
    const frozenSelected = Array.from(selectedInstances).filter((id) => isInstanceFrozen(id))
    if (frozenSelected.length > 0) return

    setBulkActionLoading(action)
    const promises = Array.from(selectedInstances).map((instanceId) => callAction(action, instanceId))

    try {
      await Promise.all(promises)
      await fetchInstances()
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
    } finally {
      setBulkActionLoading(null)
      setSelectedInstances(new Set())
    }
  }

  const callAction = useCallback(
    async (action: string, instanceId: string) => {
      const instance = instances.find((inst) => inst.InstanceId === instanceId)
      if (!instance) return

      try {
        await axios.post(
          "/api/lab-proxy",
          {
            path: `/${action}`,
            method: "POST",
            body: {
              instance_id: instanceId,
              region: instance.Region,
            },
          },
          {
            headers: { "x-user-email": email },
          },
        )

        await logToSplunk({
          session: email,
          action: `lab_instance_${action}`,
          details: {
            instance_id: instanceId,
            instance_name: instance.Name,
            public_ip: instance.PublicIp || "N/A",
          },
        })
      } catch (error) {
        console.error(`Action ${action} failed:`, error)
      }
    },
    [email, instances],
  )

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (email && hasLab && instances.length > 0) {
      interval = setInterval(() => {
        fetchInstances()
      }, 3000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [email, hasLab, instances.length, fetchInstances])

  const handleCopy = useCallback((text: string, fieldId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 1500)
  }, [])

  const renderCopyField = (text: string, fieldId: string, truncate?: boolean) => {
    const displayText = truncate && text.length > 25 ? text.substring(0, 25) + "..." : text
    return (
      <div className="relative inline-flex items-center">
        <span className="mr-1.5">{displayText}</span>
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCopy(text, fieldId)
          }}
          className="cursor-pointer p-0.5 rounded-md flex items-center justify-center bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:text-gray-700 transition-colors duration-200"
        >
          <Copy size={14} className="text-gray-500" />
        </div>
        {copiedField === fieldId && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-200">
            Copied!
          </div>
        )}
      </div>
    )
  }

  const baseStyle: React.CSSProperties = {
    padding: "6px 14px",
    fontSize: "0.85rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "Inter, sans-serif",
    color: "white",
    whiteSpace: "nowrap",
  }

  const actionStyles: Record<string, { backgroundColor: string; hover: string }> = {
    start: {
      backgroundColor: "#10b981",
      hover: "#059669",
    },
    stop: {
      backgroundColor: "#ef4444",
      hover: "#dc2626",
    },
    reboot: {
      backgroundColor: "#f59e0b",
      hover: "#d97706",
    },
    "get-password": {
      backgroundColor: "#3b82f6",
      hover: "#2563eb",
    },
  }

  const getButtonTooltip = useCallback(
    (action: string, instanceId: string, instanceName: string) => {
      const key = `${instanceId}_${action}`

      if (isInstanceFrozen(instanceId)) {
        const remainingTime = frozenClusterRemainingTimes[instanceId] || 0
        const tooltipText = `Cluster configuration is in progress. Please wait ${formatRemainingTime(remainingTime)} minutes.`

        // Update stable tooltip only if it's significantly different (to prevent flickering)
        const currentStable = stableTooltips[key]
        if (!currentStable || !currentStable.includes(formatRemainingTime(remainingTime))) {
          setStableTooltips((prev) => ({ ...prev, [key]: tooltipText }))
        }

        return stableTooltips[key] || tooltipText
      }

      const cooldownKey = `${instanceId}_${action}`
      if (disabledButtons[cooldownKey]) {
        return `${action.charAt(0).toUpperCase() + action.slice(1)} action is in cooldown. Please wait.`
      }

      // Clear stable tooltip for non-frozen states
      if (stableTooltips[key]) {
        setStableTooltips((prev) => {
          const newState = { ...prev }
          delete newState[key]
          return newState
        })
      }

      switch (action) {
        case "start":
          return `Start ${instanceName} server`
        case "stop":
          return `Stop ${instanceName} server`
        case "reboot":
          return `Reboot ${instanceName} server`
        case "get-password":
          return isPasswordRateLimited
            ? `Try again in ${formatRemainingTime(remainingTime)}`
            : `Get Windows password for ${instanceName}`
        default:
          return `${action.charAt(0).toUpperCase() + action.slice(1)} ${instanceName}`
      }
    },
    [
      frozenClusterRemainingTimes,
      stableTooltips,
      disabledButtons,
      isPasswordRateLimited,
      remainingTime,
      formatRemainingTime,
      isInstanceFrozen,
    ],
  )

  const getBulkButtonTooltip = useCallback(
    (action: string) => {
      const frozenSelected = Array.from(selectedInstances).filter((id) => isInstanceFrozen(id))

      if (frozenSelected.length > 0) {
        const firstFrozenId = frozenSelected[0]
        const remainingTime = frozenClusterRemainingTimes[firstFrozenId] || 0
        const key = `bulk_${action}`
        const tooltipText = `Cluster configuration is in progress. Please wait ${formatRemainingTime(remainingTime)} minutes.`

        // Update stable tooltip only if it's significantly different
        const currentStable = stableTooltips[key]
        if (!currentStable || !currentStable.includes(formatRemainingTime(remainingTime))) {
          setStableTooltips((prev) => ({ ...prev, [key]: tooltipText }))
        }

        return stableTooltips[key] || tooltipText
      }

      if (selectedInstances.size === 0) {
        return `Select servers to perform bulk ${action}`
      }
      return `${action.charAt(0).toUpperCase() + action.slice(1)} all selected servers`
    },
    [selectedInstances, frozenClusterRemainingTimes, stableTooltips, formatRemainingTime, isInstanceFrozen],
  )

  const renderButton = (label: string, action: string, instanceId: string, instanceName = "") => {
    const key = `${instanceId}_${action}`
    const disabled = isCooldown(instanceId, action)
    const isLoading = loadingAction === key
    const isFrozen = isInstanceFrozen(instanceId)

    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isFrozen) {
            handleButtonClick(action, instanceId)
          }
        }}
        style={{
          ...baseStyle,
          backgroundColor: disabled ? "#9ca3af" : actionStyles[action].backgroundColor,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
        disabled={disabled}
        title={getButtonTooltip(action, instanceId, instanceName)}
        onMouseEnter={(e) => {
          if (!disabled) {
            ;(e.target as HTMLButtonElement).style.backgroundColor = actionStyles[action].hover
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            ;(e.target as HTMLButtonElement).style.backgroundColor = actionStyles[action].backgroundColor
          }
        }}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isFrozen ? (
          formatRemainingTime(frozenClusterRemainingTimes[instanceId] || 0)
        ) : (
          label
        )}
      </button>
    )
  }

  const renderBulkButton = (label: string, action: string) => {
    const isLoading = bulkActionLoading === action
    const frozenSelected = Array.from(selectedInstances).filter((id) => isInstanceFrozen(id))
    const disabled = selectedInstances.size === 0 || isLoading || frozenSelected.length > 0

    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (frozenSelected.length === 0) {
            handleBulkAction(action)
          }
        }}
        style={{
          ...baseStyle,
          backgroundColor: disabled ? "#9ca3af" : actionStyles[action].backgroundColor,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
        disabled={disabled}
        title={getBulkButtonTooltip(action)}
        onMouseEnter={(e) => {
          if (!disabled) {
            ;(e.target as HTMLButtonElement).style.backgroundColor = actionStyles[action].hover
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            ;(e.target as HTMLButtonElement).style.backgroundColor = actionStyles[action].backgroundColor
          }
        }}
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : `${label} Selected (${selectedInstances.size})`}
      </button>
    )
  }

  const handleClusterConfiguration = useCallback(
    async (serviceInstances: EC2Instance[]) => {
      const clusterInfo = hasCompleteClusterSet(serviceInstances)
      if (!clusterInfo.hasComplete || !clusterInfo.username) return

      setClusterConfigModal({
        isOpen: true,
        loading: false,
        error: null,
        success: false,
        username: clusterInfo.username,
        email: email,
        editableUsername: false,
        startingInstances: false,
        checkingLicense: false,
        licenseError: null,
        needsLicenseUpload: false,
        managementServerNotFound: false,
        stoppedInstances: [] as any[],
        splunkValidationTimer: 0,
        splunkValidationInProgress: false,
        splunkValidationResults: null as any,
        showProceedAfterTimer: false,
      })
    },
    [email],
  )

  const handleStartAllClusterInstances = useCallback(async () => {
    setClusterConfigModal((prev) => ({ ...prev, startingInstances: true }))

    try {
      const clusterInstances = getClusterInstancesForUsername(clusterConfigModal.username)
      const stoppedInstances = clusterInstances.filter((inst) => inst.State === "stopped")

      const promises = stoppedInstances.map((inst) => callAction("start", inst.InstanceId))
      await Promise.all(promises)

      // Refresh instances to get updated states
      await fetchInstances()

      // Clear the error after starting instances
      setClusterConfigModal((prev) => ({
        ...prev,
        error: null,
        startingInstances: false,
        managementServerNotFound: false,
      }))
    } catch (error) {
      console.error("Error starting cluster instances:", error)
      setClusterConfigModal((prev) => ({ ...prev, startingInstances: false }))
    }
  }, [clusterConfigModal.username, callAction, fetchInstances, getClusterInstancesForUsername])

  const handleStartAllInstances = useCallback(
    async (instancesToStart: EC2Instance[]) => {
      setClusterConfigModal((prev) => ({ ...prev, startingInstances: true }))

      try {
        const promises = instancesToStart.map((inst) => callAction("start", inst.InstanceId))
        await Promise.all(promises)

        // Refresh instances to get updated states
        await fetchInstances()

        // Clear the error after starting instances
        setClusterConfigModal((prev) => ({
          ...prev,
          error: null,
          startingInstances: false,
          managementServerNotFound: false,
          stoppedInstances: [],
        }))
      } catch (error) {
        console.error("Error starting cluster instances:", error)
        setClusterConfigModal((prev) => ({ ...prev, startingInstances: false }))
      }
    },
    [callAction, fetchInstances],
  )

  const handleCloseClusterModal = useCallback(() => {
    setClusterConfigModal({
      isOpen: false,
      loading: false,
      error: null,
      success: false,
      username: "",
      email: "",
      editableUsername: false,
      startingInstances: false,
      checkingLicense: false,
      licenseError: null,
      needsLicenseUpload: false,
      managementServerNotFound: false,
      stoppedInstances: [],
      splunkValidationTimer: 0,
      splunkValidationInProgress: false,
      splunkValidationResults: null,
      showProceedAfterTimer: false,
    })
  }, [])

  const handleGetPassword = useCallback(
    async (instanceId: string) => {
      if (isPasswordRateLimited) {
        console.warn("Password retrieval limit reached. Please wait for the next 20-minute window.")
        return
      }

      if (passwordModal.loading) {
        return
      }

      const newCount = passwordClickCount + 1
      setPasswordClickCount(newCount)
      localStorage.setItem(`${email}-passwordClickCount`, newCount.toString())
      localStorage.setItem(`${email}-passwordLastResetTime`, passwordLastResetTime.toString())

      if (newCount >= MAX_PASSWORD_CLICKS) {
        setIsPasswordRateLimited(true)
      }

      setPasswordModal((prev) => ({
        ...prev,
        isOpen: true,
        loading: true,
        error: null,
        details: null,
      }))
      onPasswordModalOpenChange?.(true)

      const instance = instances.find((inst) => inst.InstanceId === instanceId)
      if (!instance) {
        setPasswordModal((prev) => ({
          ...prev,
          loading: false,
          error: "Instance not found",
        }))
        return
      }

      try {
        const response = await axios.post(
          "/api/win-pass",
          {
            instance_id: instanceId,
            email: email,
          },
          {
            headers: { "Content-Type": "application/json" },
          },
        )

        if (response.data.status === "success" && response.data.decrypted_password) {
          setPasswordModal((prev) => ({
            ...prev,
            loading: false,
            error: null,
            details: {
              username: "Administrator",
              password: response.data.decrypted_password,
              publicIp: instance.PublicIp,
            },
          }))

          await logToSplunk({
            session: email,
            action: "get_windows_password",
            details: {
              instance_id: instanceId,
              instance_name: "Windows(AD&DNS)",
              status: "success",
            },
          })
        } else {
          setPasswordModal((prev) => ({
            ...prev,
            loading: false,
            error: response.data.message || "Failed to retrieve password.",
            details: null,
          }))

          await logToSplunk({
            session: email,
            action: "get_windows_password",
            details: {
              instance_id: instanceId,
              instance_name: "Windows(AD&DNS)",
              status: "failed",
              error: response.data.message || "Unknown error",
            },
          })
        }
      } catch (error) {
        console.error("Error fetching Windows password:", error)
        setPasswordModal((prev) => ({
          ...prev,
          loading: false,
          error: "An error occurred while fetching the password. Please try again.",
          details: null,
        }))

        await logToSplunk({
          session: email,
          action: "get_windows_password",
          details: {
            instance_id: instanceId,
            instance_name: "Windows(AD&DNS)",
            status: "failed",
            error: (error as Error).message || "Network error",
          },
        })
      }
    },
    [
      isPasswordRateLimited,
      passwordModal.loading,
      passwordClickCount,
      passwordLastResetTime,
      email,
      instances,
      onPasswordModalOpenChange,
    ],
  )

  const handleClosePasswordModal = useCallback(() => {
    setPasswordModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      error: null,
      details: null,
    }))
    onPasswordModalOpenChange?.(false)
  }, [onPasswordModalOpenChange])

  const toggleRowExpansion = useCallback((instanceId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [instanceId]: !prev[instanceId],
    }))
  }, [])

  const toggleExpiryColumn = useCallback((serviceType: string) => {
    setShowExpiryColumn((prev) => ({
      ...prev,
      [serviceType]: !prev[serviceType],
    }))
  }, [])

  const handleInstanceSelection = useCallback((instanceId: string, checked: boolean) => {
    setSelectedInstances((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(instanceId)
      } else {
        newSet.delete(instanceId)
      }
      return newSet
    })
  }, [])

  const handleSelectAllForServiceType = useCallback(
    (serviceType: string, checked: boolean) => {
      const serviceInstances = groupedInstances[serviceType]
      setSelectedInstances((prev) => {
        const newSet = new Set(prev)
        serviceInstances.forEach((instance) => {
          if (checked) {
            newSet.add(instance.InstanceId)
          } else {
            newSet.delete(instance.InstanceId)
          }
        })
        return newSet
      })
    },
    [instances],
  )

  const handleKeepOnlyRunning = useCallback(() => {
    setSelectedInstances((prev) => {
      const newSet = new Set<string>()
      Array.from(prev).forEach((instanceId) => {
        const instance = instances.find((inst) => inst.InstanceId === instanceId)
        if (instance && instance.State === "running") {
          newSet.add(instanceId)
        }
      })
      return newSet
    })
  }, [instances])

  const handleKeepOnlyStopped = useCallback(() => {
    setSelectedInstances((prev) => {
      const newSet = new Set<string>()
      Array.from(prev).forEach((instanceId) => {
        const instance = instances.find((inst) => inst.InstanceId === instanceId)
        if (instance && instance.State === "stopped") {
          newSet.add(instanceId)
        }
      })
      return newSet
    })
  }, [instances])

  const groupedInstances = useMemo(() => {
    return instances.reduce<Record<string, EC2Instance[]>>((acc, inst) => {
      const key = inst.ServiceType || "Unknown"
      if (!acc[key]) acc[key] = []
      acc[key].push(inst)
      return acc
    }, {})
  }, [instances])

  const orderedServiceTypes = Object.keys(groupedInstances).sort((a, b) => {
    if (a === "Splunk") return -1
    if (b === "Splunk") return 1
    return 0
  })

  const selectedInstanceDetails = Array.from(selectedInstances)
    .map((id) => instances.find((inst) => inst.InstanceId === id))
    .filter(Boolean) as EC2Instance[]

  const allSelectedStopped =
    selectedInstanceDetails.length > 0 && selectedInstanceDetails.every((inst) => inst.State === "stopped")
  const allSelectedRunning =
    selectedInstanceDetails.length > 0 && selectedInstanceDetails.every((inst) => inst.State === "running")
  const hasMixedStates = selectedInstances.size > 0 && !allSelectedStopped && !allSelectedRunning

  const formatFloatHours = (hours: number): string => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }

  const toggleCredentialExpansion = useCallback((instanceId: string) => {
    setExpandedCredentials((prev) => ({
      ...prev,
      [instanceId]: !prev[instanceId],
    }))
  }, [])

  useEffect(() => {
    // Clean up stable tooltips for instances that no longer exist
    const currentInstanceIds = new Set(instances.map((inst) => inst.InstanceId))
    setStableTooltips((prev) => {
      const newState = { ...prev }
      let hasChanges = false

      Object.keys(newState).forEach((key) => {
        const instanceId = key.split("_")[0]
        if (instanceId && !currentInstanceIds.has(instanceId)) {
          delete newState[key]
          hasChanges = true
        }
      })

      return hasChanges ? newState : prev
    })
  }, [instances])

  return (
    <div style={{ marginTop: 20 }}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800"></h2>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            fetchInstances()
          }}
          disabled={refreshing}
          className={`p-2 rounded-full ${
            refreshing ? "bg-gray-400 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 text-gray-700"
          } text-white`}
          title="Refresh"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {instances.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto bg-white border border-gray-200 shadow-lg rounded-2xl p-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">You don't have any servers here.</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-gray-700 text-sm leading-relaxed">
                It looks like you don't have a lab assigned yet. Choose a plan to get started with your personalized lab
                setup.
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.location.href = "/"
              }}
              className="w-full bg-green-600 hover:bg-green-700 transition-colors text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Choose Lab Plan
            </button>
          </div>
        </div>
      ) : (
        <>
          {selectedInstances.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-blue-800">
                  {selectedInstances.size} server{selectedInstances.size > 1 ? "s" : ""} selected:
                </span>
                {allSelectedStopped && renderBulkButton("Start", "start")}
                {allSelectedRunning && (
                  <>
                    {renderBulkButton("Stop", "stop")}
                    {renderBulkButton("Reboot", "reboot")}
                  </>
                )}
                {hasMixedStates && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleKeepOnlyRunning()
                      }}
                      className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                      Keep only Running
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleKeepOnlyStopped()
                      }}
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      Keep only Stopped
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedInstances(new Set())
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {orderedServiceTypes.map((serviceType) => {
            const serviceInstances = groupedInstances[serviceType]
            const selectedInService = serviceInstances.filter((inst) => selectedInstances.has(inst.InstanceId)).length
            const allSelectedInService = selectedInService === serviceInstances.length
            const someSelectedInService = selectedInService > 0 && selectedInService < serviceInstances.length
            const allUsageRowsExpanded = serviceInstances.every((inst) => expandedUsageRows[inst.InstanceId])
            const clusterInfo = hasCompleteClusterSet(serviceInstances)

            return (
              <div key={serviceType} style={{ marginBottom: 40 }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold text-green-600">
                    {serviceType} Servers
                    {serviceType === "Splunk" && (
                      <span className="text-gray-500 text-sm font-normal ml-2">
                        (username: admin, password: admin123)
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {clusterInfo.hasComplete && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleClusterConfiguration(serviceInstances)
                        }}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white rounded-md transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                        title="Configure Cluster"
                      >
                        <Database size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Cluster Config</span>
                        <span className="sm:hidden">Config</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleExpiryColumn(serviceType)
                      }}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      title={`${showExpiryColumn[serviceType] ? "Hide" : "Show"} Expiry`}
                    >
                      {showExpiryColumn[serviceType] ? (
                        <EyeOff size={14} className="sm:w-4 sm:h-4" />
                      ) : (
                        <Eye size={14} className="sm:w-4 sm:h-4" />
                      )}
                      <span className="hidden sm:inline">Expiry</span>
                      <span className="sm:hidden">Exp</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const newState = !allUsageRowsExpanded
                        serviceInstances.forEach((inst) => {
                          setExpandedUsageRows((prev) => ({
                            ...prev,
                            [inst.InstanceId]: newState,
                          }))
                        })
                      }}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                      title="Toggle Usage Details"
                    >
                      {allUsageRowsExpanded ? (
                        <EyeOff size={14} className="sm:w-4 sm:h-4 transition-transform duration-300" />
                      ) : (
                        <Eye size={14} className="sm:w-4 sm:h-4 transition-transform duration-300" />
                      )}
                      <span className="hidden sm:inline">More Details</span>
                      <span className="sm:hidden">Details</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: showExpiryColumn[serviceType] ? 900 : 800,
                      fontSize: "0.95rem",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                        <th style={{ padding: "10px", width: "40px" }}>
                          <input
                            type="checkbox"
                            checked={allSelectedInService}
                            ref={(input) => {
                              if (input) input.indeterminate = someSelectedInService
                            }}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleSelectAllForServiceType(serviceType, e.target.checked)
                            }}
                            className="rounded"
                          />
                        </th>
                        <th style={{ padding: "10px" }}>Server Name</th>
                        <th style={{ padding: "10px" }}>State</th>
                        <th style={{ padding: "10px" }}>Private IP</th>
                        <th style={{ padding: "10px" }}>Public IP</th>
                        <th style={{ padding: "10px" }}>SSH Command</th>
                        {showExpiryColumn[serviceType] && <th style={{ padding: "10px" }}>Expiry</th>}
                        <th style={{ padding: "10px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceInstances.map((inst) => {
                        const state = inst.State.toLowerCase()
                        const isStopped = state === "stopped"
                        const isRunning = state === "running"
                        const isMutedState = ["pending", "starting"].includes(state)
                        const isBusyState = ["pending", "starting", "stopping", "rebooting"].includes(state)
                        const showToggle = ["MYSQL", "Jenkins", "MSSQL", "OSSEC", "OpenVPN"].includes(inst.Name)
                        const isWindowsADDNS = inst.Name === "Windows(AD&DNS)"
                        const isSelected = selectedInstances.has(inst.InstanceId)

                        return (
                          <React.Fragment key={inst.InstanceId}>
                            <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "10px" }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleInstanceSelection(inst.InstanceId, e.target.checked)
                                  }}
                                  className="rounded"
                                />
                              </td>
                              <td style={{ padding: "10px" }}>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span>{inst.Name}</span>
                                    {(() => {
                                      const urgency = getNotificationUrgency(inst.InstanceId)
                                      if (urgency) {
                                        return (
                                          <div
                                            className={`relative w-2 h-2 rounded-full cursor-pointer animate-pulse ${
                                              urgency.level === "high" ? "bg-red-500" : "bg-yellow-500"
                                            }`}
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              toggleUsageDetails(inst.InstanceId)
                                            }}
                                            title={getNotificationTooltip(urgency)}
                                          >
                                            <div
                                              className={`absolute inset-0 rounded-full animate-ping ${
                                                urgency.level === "high" ? "bg-red-400" : "bg-yellow-400"
                                              }`}
                                            />
                                          </div>
                                        )
                                      }
                                      return null
                                    })()}
                                  </div>
                                  {showToggle && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleCredentialExpansion(inst.InstanceId)
                                      }}
                                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                      title="Toggle Credentials"
                                    >
                                      {expandedCredentials[inst.InstanceId] ? (
                                        <ChevronUp size={16} />
                                      ) : (
                                        <ChevronDown size={16} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {inst.State}
                                {isBusyState && <Loader2 size={14} className="animate-spin text-gray-500" />}
                              </td>
                              <td style={{ padding: "10px" }}>
                                {inst.PrivateIp ? renderCopyField(inst.PrivateIp, `${inst.InstanceId}_private`) : "-"}
                              </td>
                              <td style={{ padding: "10px" }}>
                                {inst.PublicIp ? renderCopyField(inst.PublicIp, `${inst.InstanceId}_public`) : "-"}
                              </td>
                              <td style={{ padding: "10px" }}>
                                {isWindowsADDNS
                                  ? "-"
                                  : inst.State === "running" && inst.PublicIp && inst.SSHCommand
                                    ? renderCopyField(inst.SSHCommand, `${inst.InstanceId}_ssh`, true)
                                    : "-"}
                              </td>
                              {showExpiryColumn[serviceType] && (
                                <td style={{ padding: "10px" }}>
                                  <div className="flex items-center gap-2">
                                    <span>{getInstanceExpiryDate(inst.InstanceId)}</span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleUsageDetails(inst.InstanceId)
                                      }}
                                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                      title="Toggle Usage Details"
                                    >
                                      {expandedUsageRows[inst.InstanceId] ? (
                                        <ChevronUp size={14} />
                                      ) : (
                                        <ChevronDown size={14} />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td
                                style={{
                                  padding: "10px",
                                  whiteSpace: "nowrap",
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                {!isMutedState &&
                                  isStopped &&
                                  renderButton("Start", "start", inst.InstanceId, inst.Name)}
                                {!isMutedState && isRunning && (
                                  <>
                                    {renderButton("Stop", "stop", inst.InstanceId, inst.Name)}
                                    {renderButton("Reboot", "reboot", inst.InstanceId, inst.Name)}
                                  </>
                                )}
                                {isWindowsADDNS && inst.State === "running" && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleGetPassword(inst.InstanceId)
                                    }}
                                    style={{
                                      ...baseStyle,
                                      backgroundColor:
                                        passwordModal.loading || isPasswordRateLimited
                                          ? "#9ca3af"
                                          : actionStyles["get-password"].backgroundColor,
                                      cursor:
                                        passwordModal.loading || isPasswordRateLimited ? "not-allowed" : "pointer",
                                      opacity: passwordModal.loading || isPasswordRateLimited ? 0.6 : 1,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      position: "relative",
                                    }}
                                    disabled={passwordModal.loading || isPasswordRateLimited}
                                    title={getButtonTooltip("get-password", inst.InstanceId, inst.Name)}
                                  >
                                    {passwordModal.loading ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Key size={14} />
                                    )}
                                    {isPasswordRateLimited ? formatRemainingTime(remainingTime) : "Get Password"}
                                    <span className="absolute -top-2 -right-2 bg-blue-700 text-white text-xs font-bold rounded-full h-5 w-auto min-w-[20px] px-1 flex items-center justify-center">
                                      {MAX_PASSWORD_CLICKS - passwordClickCount}/{MAX_PASSWORD_CLICKS}
                                    </span>
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expandedCredentials[inst.InstanceId] && (
                              <tr id={`details-${inst.InstanceId}`} className="bg-gray-50 dark:bg-gray-800">
                                <td
                                  colSpan={showExpiryColumn[serviceType] ? 8 : 7}
                                  style={{ padding: "10px 10px 10px 20px" }}
                                >
                                  <div className="text-xs text-gray-700 dark:text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
                                    {inst.Name === "MYSQL" && (
                                      <>
                                        <span>
                                          <strong>Root Password:</strong> Admin@123!
                                        </span>
                                        <span>
                                          <strong>Splunk User:</strong> admin
                                        </span>
                                        <span>
                                          <strong>Splunk Password:</strong> Admin@123!
                                        </span>
                                      </>
                                    )}
                                    {inst.Name === "Jenkins" && (
                                      <>
                                        <span>
                                          <strong>Admin Username:</strong> admin
                                        </span>
                                        <span>
                                          <strong>Admin Password:</strong> admin123
                                        </span>
                                      </>
                                    )}
                                    {inst.Name === "MSSQL" && (
                                      <>
                                        <span>
                                          <strong>Root Password:</strong> Admin@123!
                                        </span>
                                        <span>
                                          <strong>User Password:</strong> Admin@123!
                                        </span>
                                      </>
                                    )}
                                    {inst.Name === "OSSEC" && (
                                      <>
                                        <span>
                                          <strong>Admin User:</strong> admin
                                        </span>
                                        <span>
                                          <strong>Admin Password:</strong> admin123
                                        </span>
                                      </>
                                    )}
                                    {inst.Name === "OpenVPN" && (
                                      <>
                                        <span>
                                          <strong>User:</strong> openvpn
                                        </span>
                                        <span>
                                          <strong>Password:</strong> SoftMania@123
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                            {expandedUsageRows[inst.InstanceId] &&
                              (() => {
                                const usageDetails = getInstanceUsageDetails(inst.InstanceId)
                                return usageDetails ? (
                                  <tr className="bg-blue-50 dark:bg-blue-900/20">
                                    <td
                                      colSpan={showExpiryColumn[serviceType] ? 8 : 7}
                                      style={{ padding: "10px 10px 10px 20px" }}
                                    >
                                      <div className="text-sm">
                                        <div className="flex justify-between items-center mb-2">
                                          <h4 className="font-semibold text-blue-800">Usage Summary</h4>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleExtendValidity(inst.InstanceId, inst.Name)
                                              }}
                                              className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white rounded-md transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                                              title="Extend Validity"
                                            >
                                              <AlertCircle size={12} />
                                              <span className="hidden sm:inline">Extend Validity</span>
                                              <span className="sm:hidden">Extend</span>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                fetchUsageSummary()
                                              }}
                                              disabled={isRefreshingUsage}
                                              className={`p-1 rounded-full ${
                                                isRefreshingUsage
                                                  ? "bg-gray-400 cursor-not-allowed"
                                                  : "bg-amber-500 hover:bg-amber-600 text-gray-700"
                                              } text-white`}
                                              title="Refresh Usage"
                                            >
                                              <RefreshCcw
                                                className={`w-4 h-4 ${isRefreshingUsage ? "animate-spin" : ""}`}
                                              />
                                            </button>
                                          </div>
                                        </div>
                                        {(usageDetails.balance_hours <= 0 || usageDetails.balance_days <= 0) && (
                                          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 rounded px-3 py-1 mb-2 text-sm">
                                            ⚠️ <strong>Quota exhausted.</strong> Server will be terminated soon.
                                          </div>
                                        )}
                                        <div
                                          className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded px-3 py-2 text-sm ${
                                            usageDetails.balance_hours <= 0 || usageDetails.balance_days <= 0
                                              ? "bg-red-50 border border-red-200 text-red-800"
                                              : "bg-green-50 border border-green-200 text-gray-800"
                                          }`}
                                        >
                                          <span>
                                            <strong>Quota:</strong> {formatFloatHours(usageDetails.quota_hours)} hrs
                                          </span>
                                          <span>
                                            <strong>Used:</strong> {formatFloatHours(usageDetails.used_hours)} hrs
                                          </span>
                                          <span>
                                            <strong>Left:</strong> {formatFloatHours(usageDetails.balance_hours)} hrs
                                          </span>
                                          <span className="text-gray-400">|</span>
                                          <span>
                                            <strong>Valid:</strong> {usageDetails.quota_days} days
                                          </span>
                                          <span>
                                            <strong>Start:</strong> {usageDetails.plan_start_date || "N/A"}
                                          </span>
                                          <span className="flex items-center gap-2">
                                            <strong>End:</strong> {usageDetails.plan_end_date || "N/A"}
                                            <span className="text-red-500">(terminate)</span>
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null
                              })()}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Password Display Modal */}
      <Dialog
        open={passwordModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClosePasswordModal()
          }
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] flex flex-col overflow-hidden"
          onPointerDownOutside={(e) => {
            e.preventDefault()
            handleClosePasswordModal()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            handleClosePasswordModal()
          }}
        >
          <DialogHeader className="relative bg-green-50 dark:bg-gray-800 p-6 pb-4 rounded-t-2xl">
            <div className="text-center pr-12">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Windows Server Credentials
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Use these credentials to connect to your Windows server.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div
            data-modal-content
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300 p-6"
            onWheel={(e) => {
              e.stopPropagation()
            }}
          >
            {passwordModal.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Fetching password...</span>
              </div>
            ) : passwordModal.error ? (
              <div className="text-red-500 text-center py-4">{passwordModal.error}</div>
            ) : passwordModal.details ? (
              <div className="space-y-4">
                {passwordModal.details.publicIp && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-0">Public IP:</span>
                    <div className="flex items-center gap-2 flex-wrap justify-end sm:justify-start">
                      <span className="font-semibold text-gray-800 dark:text-white text-base break-all">
                        {passwordModal.details.publicIp}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCopy(passwordModal.details?.publicIp ?? "", "win-public-ip")
                        }}
                        className="relative h-7 w-7 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedField === "win-public-ip" && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-200">
                            Copied!
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-0">Username:</span>
                  <div className="flex items-center gap-2 flex-wrap justify-end sm:justify-start">
                    <span className="font-semibold text-gray-800 dark:text-white text-base break-all">
                      {passwordModal.details.username}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(passwordModal.details?.username ?? "", "win-username")
                      }}
                      className="relative h-7 w-7 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedField === "win-username" && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-200">
                          Copied!
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-start bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Password:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 dark:text-white text-base break-all">
                      {passwordModal.details.password}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(passwordModal.details?.password ?? "", "win-password")
                      }}
                      className="relative h-7 w-7 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedField === "win-password" && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-200">
                          Copied!
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No password details available.</div>
            )}
          </div>
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 p-6 rounded-b-2xl">
            <div className="flex justify-center">
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleClosePasswordModal()
                }}
                className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cluster Configuration Modal */}
      <Dialog
        open={clusterConfigModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseClusterModal()
          }
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] flex flex-col overflow-hidden"
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader className="relative bg-gradient-to-r from-yellow-50 to-yellow-100 dark:bg-gray-800 p-6 pb-4 rounded-t-2xl flex-shrink-0">
            <div className="text-center pr-12">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Cluster Configuration
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Configure your Splunk cluster deployment
              </DialogDescription>
            </div>
          </DialogHeader>

          <div
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300 p-6"
            onWheel={(e) => {
              e.stopPropagation()
            }}
          >
            {clusterConfigModal.success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <Database className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Cluster Configuration Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your Splunk cluster has been successfully configured and is ready for use.
                </p>
              </div>
            ) : (
              <>
                {clusterConfigModal.error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Error:</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{clusterConfigModal.error}</p>

                        {/* Show stopped servers list if any */}
                        {clusterConfigModal.stoppedInstances.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                              Servers to be started:
                            </p>
                            <ul className="space-y-1">
                              {clusterConfigModal.stoppedInstances.map((instance) => (
                                <li key={instance.InstanceId} className="text-sm text-red-700 dark:text-red-300">
                                  • {instance.Name} ({instance.State})
                                </li>
                              ))}
                            </ul>
                            <Button
                              onClick={() => handleStartAllInstances(clusterConfigModal.stoppedInstances)}
                              className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white"
                              disabled={clusterConfigModal.startingInstances}
                            >
                              {clusterConfigModal.startingInstances ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Starting Servers...
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Start All Servers
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {clusterConfigModal.splunkValidationInProgress && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Validating Splunk installation on all cluster servers...
                      </p>
                    </div>
                  </div>
                )}

                {clusterConfigModal.splunkValidationResults && clusterConfigModal.splunkValidationTimer > 0 && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        All cluster servers have Splunk installed!
                      </p>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                      Waiting for Splunk services to be ready... ({clusterConfigModal.splunkValidationTimer}s)
                    </p>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${((15 - clusterConfigModal.splunkValidationTimer) / 15) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {clusterConfigModal.showProceedAfterTimer && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Please click to proceed with license validation
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username:</label>
                    <input
                      type="text"
                      value={clusterConfigModal.username}
                      onChange={(e) => setClusterConfigModal((prev) => ({ ...prev, username: e.target.value }))}
                      disabled={true} // Always disabled as requested
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Auto-detected from your cluster instances
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email:</label>
                    <input
                      type="email"
                      value={clusterConfigModal.email}
                      onChange={(e) => setClusterConfigModal((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={true} // Always disabled as requested
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your logged-in email address</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex-shrink-0 bg-white dark:bg-gray-900 p-6 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end gap-3">
              {clusterConfigModal.success ? (
                <Button
                  onClick={handleCloseClusterModal}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCloseClusterModal}
                    variant="outline"
                    disabled={clusterConfigModal.loading}
                    className="px-6 py-2 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={
                      clusterConfigModal.showProceedAfterTimer ? proceedToLicenseValidation : handleClusterConfigSubmit
                    }
                    disabled={
                      clusterConfigModal.loading ||
                      clusterConfigModal.checkingLicense ||
                      clusterConfigModal.splunkValidationInProgress ||
                      (clusterConfigModal.splunkValidationTimer > 0 && !clusterConfigModal.showProceedAfterTimer) ||
                      !clusterConfigModal.username ||
                      !clusterConfigModal.email
                    }
                    className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                  >
                    {clusterConfigModal.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {clusterConfigModal.checkingLicense ? "Checking License..." : "Configuring..."}
                      </>
                    ) : clusterConfigModal.showProceedAfterTimer ? (
                      "Proceed to License Validation"
                    ) : clusterConfigModal.needsLicenseUpload ? (
                      "Retry After License Upload"
                    ) : (
                      "Proceed"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Validity Modal */}
      <Dialog
        open={extendValidityModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExtendValidityModal({
              isOpen: false,
              instanceId: "",
              instanceName: "",
              endDate: "",
            })
          }
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] flex flex-col overflow-hidden"
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader className="relative bg-gradient-to-r from-yellow-50 to-yellow-100 dark:bg-gray-800 p-6 pb-4 rounded-t-2xl flex-shrink-0">
            <div className="text-center pr-12">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Extend Validity</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Extend your server quota and validity period
              </DialogDescription>
            </div>
          </DialogHeader>

          <div
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300 p-6"
            onWheel={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Quota Increase Options</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <p>To extend your server validity, you can:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Chat with our support team directly on WhatsApp</li>
                    <li>Request validity extension based on your needs</li>
                    <li>Pay for additional quota hours to increase your limit</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Quick Support</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Get instant help from our support team via WhatsApp for quota extension and validity increase.
                </p>
                <a
                  href="https://chat.whatsapp.com/CsWBpBxMyDO3bV2Rz9r39H"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
                  onClick={() => {
                    logToSplunk({
                      session: email,
                      action: "extend_validity_whatsapp_click",
                      details: {
                        instance_id: extendValidityModal.instanceId,
                        instance_name: extendValidityModal.instanceName,
                        end_date: extendValidityModal.endDate,
                      },
                    })
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 bg-white dark:bg-gray-900 p-6 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setExtendValidityModal({
                    isOpen: false,
                    instanceId: "",
                    instanceName: "",
                    endDate: "",
                  })
                }}
                variant="outline"
                className="px-8 py-2"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EC2Table
