'use client'
import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface AccordionProps {
  items: { title: React.ReactNode; content: React.ReactNode }[]
  type?: "single" | "multiple"
}

export function Accordion({ items, type = "multiple" }: AccordionProps) {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    if (type === "single") {
      setOpenItems(openItems.includes(index) ? [] : [index])
    } else {
      setOpenItems(openItems.includes(index) ? openItems.filter((i) => i !== index) : [...openItems, index])
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <AccordionItem key={index}>
          <AccordionTrigger isOpen={openItems.includes(index)} onClick={() => toggleItem(index)}>
            {item.title}
          </AccordionTrigger>
          <AccordionContent isOpen={openItems.includes(index)}>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </div>
  )
}

export function AccordionItem({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-lg">{children}</div>
}

export function AccordionTrigger({
  children,
  isOpen,
  onClick,
}: { children: React.ReactNode; isOpen: boolean; onClick: () => void }) {
  return (
    <button className="flex justify-between items-center w-full p-4 text-left" onClick={onClick}>
      {children}
      <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "transform rotate-180" : ""}`} />
    </button>
  )
}

export function AccordionContent({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  if (!isOpen) return null
  return <div className="p-4 pt-0">{children}</div>
}

