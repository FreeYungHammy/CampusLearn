"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface AnimatedCircularProgressBarProps {
  value: number
  max?: number
  min?: number
  gaugePrimaryColor?: string
  gaugeSecondaryColor?: string
  className?: string
}

export function AnimatedCircularProgressBar({
  value,
  max = 100,
  min = 0,
  gaugePrimaryColor = "rgb(79 70 229)",
  gaugeSecondaryColor = "rgba(0, 0, 0, 0.1)",
  className = "",
}: AnimatedCircularProgressBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const normalizedValue = Math.max(min, Math.min(max, value))
  const percentage = ((normalizedValue - min) / (max - min)) * 100
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        className="h-24 w-24 -rotate-90 transform"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gaugeSecondaryColor}
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gaugePrimaryColor}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-medium text-gray-700">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}
