"use client"

import { useEffect } from "react"

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

  useEffect(() => {
    if (!isOpen) return

    // Load Razorpay script
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => {
      openRazorpayCheckout()
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [isOpen])

  const openRazorpayCheckout = () => {
    if (!window.Razorpay) {
      console.error("Razorpay SDK not loaded")
      return
    }

    const environmentName = getEnvironmentName(packageDetails.envId, amount)
    const splunkPackage = isSplunkPackage(packageDetails.envId)

    // Create form for collecting user details
    const formHtml = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h3 style="margin-bottom: 20px; color: #333;">Package Details</h3>
        
        <!-- Common Details -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Name *</label>
          <input type="text" id="user-name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter your full name">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Email *</label>
          <input type="email" id="user-email" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter your email">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Phone *</label>
          <input type="tel" id="user-phone" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter your phone number">
        </div>

        ${
          splunkPackage
            ? `
        <!-- Splunk Specific Fields -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Do you want Splunk to be installed? *</label>
          <select id="splunk-install" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">Select option</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">BotsV3 data set *</label>
          <select id="botsv3-dataset" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">Select option</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        `
            : ""
        }

        <!-- Environment Field -->
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Environment</label>
          <input type="text" id="environment" readonly value="${environmentName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background-color: #f5f5f5;">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="cancel-btn" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
          <button type="button" id="proceed-btn" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">Proceed to Payment</button>
        </div>
      </div>
    `

    // Create modal
    const modal = document.createElement("div")
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `

    const modalContent = document.createElement("div")
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    `
    modalContent.innerHTML = formHtml

    modal.appendChild(modalContent)
    document.body.appendChild(modal)

    // Handle form submission
    const proceedBtn = modalContent.querySelector("#proceed-btn")
    const cancelBtn = modalContent.querySelector("#cancel-btn")

    const closeModal = () => {
      document.body.removeChild(modal)
      onClose()
    }

    cancelBtn?.addEventListener("click", closeModal)

    proceedBtn?.addEventListener("click", () => {
      const name = (document.getElementById("user-name") as HTMLInputElement)?.value
      const email = (document.getElementById("user-email") as HTMLInputElement)?.value
      const phone = (document.getElementById("user-phone") as HTMLInputElement)?.value
      const splunkInstall = splunkPackage
        ? (document.getElementById("splunk-install") as HTMLSelectElement)?.value
        : undefined
      const botsv3Dataset = splunkPackage
        ? (document.getElementById("botsv3-dataset") as HTMLSelectElement)?.value
        : undefined

      // Validation
      if (!name || !email || !phone) {
        alert("Please fill in all required fields")
        return
      }

      if (splunkPackage && (!splunkInstall || !botsv3Dataset)) {
        alert("Please fill in all Splunk-specific fields")
        return
      }

      // Close form modal
      document.body.removeChild(modal)

      // Prepare Razorpay options
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
        prefill: {
          name: name,
          email: email,
          contact: phone,
        },
        notes: notes,
        theme: {
          color: "#16a34a",
        },
        handler: (response: any) => {
          onSuccess({
            ...response,
            userDetails: {
              name,
              email,
              phone,
              splunkInstall,
              botsv3Dataset,
              environment: environmentName,
            },
          })
        },
        modal: {
          ondismiss: () => {
            onClose()
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", (response: any) => {
        onError(response.error)
      })
      rzp.open()
    })
  }

  return null
}
