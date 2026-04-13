import { cn } from "@/lib/utils"

interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-4", className)}
    >
      {/* Stylized "C" cursor mark */}
      <rect x="2" y="2" width="28" height="28" rx="8" fill="currentColor" />
      <path
        d="M20 10H14C11.7909 10 10 11.7909 10 14V18C10 20.2091 11.7909 22 14 22H20"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="21" cy="12" r="2" fill="white" opacity="0.6" />
    </svg>
  )
}
