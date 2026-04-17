import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, change }) => {
  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg border border-gray-700 hover:shadow-xl transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="mb-2 text-center text-3xl font-bold tabular-nums">{value}</p>
      {subtitle && <p className="text-sm text-gray-400 mb-1">{subtitle}</p>}
      {change && <p className="text-sm text-green-400">{change}</p>}
    </div>
  );
};
