'use client'
import type React from "react"
import { useState } from "react"

type TabsProps = {
  tabs: { label: string; content: React.ReactNode }[]
  defaultTab?: string
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].label)

  return (
    <div className="w-full">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.label} isActive={activeTab === tab.label} onClick={() => setActiveTab(tab.label)}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.label} isActive={activeTab === tab.label}>
          {tab.content}
        </TabsContent>
      ))}
    </div>
  )
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b">{children}</div>
}

export function TabsTrigger({
  children,
  isActive,
  onClick,
}: { children: React.ReactNode; isActive: boolean; onClick: () => void }) {
  return (
    <button
      className={`px-4 py-2 font-medium text-sm focus:outline-none ${
        isActive ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function TabsContent({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  if (!isActive) return null
  return <div className="mt-4">{children}</div>
}

