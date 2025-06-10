"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// Sample data for the chart - this would be fetched from the API
const data = [
  { date: 'Mar 15', calls: 12, duration: 96 },
  { date: 'Mar 16', calls: 19, duration: 144 },
  { date: 'Mar 17', calls: 15, duration: 105 },
  { date: 'Mar 18', calls: 22, duration: 168 },
  { date: 'Mar 19', calls: 30, duration: 246 },
  { date: 'Mar 20', calls: 28, duration: 210 },
  { date: 'Mar 21', calls: 26, duration: 228 },
  { date: 'Mar 22', calls: 35, duration: 312 },
  { date: 'Mar 23', calls: 33, duration: 246 },
  { date: 'Mar 24', calls: 28, duration: 204 },
]

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-black p-3 border rounded-lg shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          <span className="text-blue-500 font-medium">{payload[0].value}</span> calls
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-green-500 font-medium">{payload[0].payload.duration}</span> minutes
        </p>
      </div>
    )
  }

  return null
}

export function CallsChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="calls"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
