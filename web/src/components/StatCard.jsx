const colorMap = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
};

export default function StatCard({ title, value, icon, color = 'blue', sub }) {
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border ${c.border}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <span className={`text-2xl p-1.5 rounded-lg ${c.bg}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
