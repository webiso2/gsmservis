// --- START OF FILE src/components/reports/ReportCharts.tsx ---

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

interface ReportChartsProps {
  dailyTrend: any[];
  expenseByCategory: any[];
  salesByCategory: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 border border-blue-500/30 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="font-bold text-gray-200 mb-2 border-b border-white/10 pb-1 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-mono font-medium text-white">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ReportCharts: React.FC<ReportChartsProps> = ({ dailyTrend, expenseByCategory, salesByCategory }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:break-inside-avoid">

      <Card className="col-span-1 lg:col-span-2 glass-card border-none text-white">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-400">
            <TrendingUp className="h-5 w-5" /> Günlük Gelir/Gider Trendi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(val) => `${val / 1000}k`} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              <Area type="monotone" dataKey="income" name="Gelir" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expense" name="Gider" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              <Line type="monotone" dataKey="net" name="Net Kâr" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-none text-white">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-400">
            <PieChartIcon className="h-5 w-5" /> Gider Dağılımı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-[350px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            {expenseByCategory.length > 0 ? (
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  formatter={(value, entry: any) => <span className="text-gray-300 text-xs ml-2">{value}</span>}
                />
              </PieChart>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                <PieChartIcon className="h-10 w-10 opacity-20" />
                <span className="text-sm">Gider verisi bulunamadı.</span>
              </div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card border-none text-white">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
            <BarChart3 className="h-5 w-5" /> Kategori Bazlı Satışlar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {salesByCategory.length > 0 ? (
              <BarChart data={salesByCategory} layout="vertical" margin={{ left: 0, right: 30, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                <Bar dataKey="value" name="Satış Tutarı" radius={[0, 4, 4, 0]} barSize={24}>
                  {salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 gap-2 h-full">
                <BarChart3 className="h-10 w-10 opacity-20" />
                <span className="text-sm">Satış verisi bulunamadı.</span>
              </div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
};
// --- END OF FILE src/components/reports/ReportCharts.tsx ---