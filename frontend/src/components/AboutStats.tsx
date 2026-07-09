import { useCountUp } from '../lib/animations';
import { Award, CheckCircle2, TrendingUp, Users, Clock, Calendar } from 'lucide-react';

type Stat = {
  end: number; suffix: string; label: string; icon: typeof Users;
  color: string; borderColor: string; iconBg: string; textColor: string;
  customTextColor?: string; isDecimal?: boolean; highlighted?: boolean;
};

const StatCard = ({ stat, index }: { stat: Stat; index: number }) => {
  const { count, elementRef } = useCountUp(stat.end, 2000);
  const Icon = stat.icon;
  const displayCount = stat.isDecimal ? stat.end : count;

  return (
    <div
      ref={elementRef}
      className={`flex flex-col items-center text-center ${stat.highlighted ? 'p-8' : 'p-6'} rounded-xl bg-gradient-to-br ${stat.color} border ${stat.borderColor} card-hover transition-all duration-300 ${stat.highlighted ? 'shadow-lg' : ''}`}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div
        className={`${stat.highlighted ? 'w-20 h-20' : 'w-16 h-16'} rounded-full ${!stat.iconBg.startsWith('var') ? stat.iconBg : ''} flex items-center justify-center mb-4`}
        style={stat.iconBg.startsWith('var') ? { backgroundColor: stat.iconBg } : undefined}
      >
        <Icon className={`${stat.highlighted ? 'w-10 h-10' : 'w-8 h-8'} text-white`} />
      </div>
      <div
        className={`${stat.highlighted ? 'text-4xl font-extrabold' : 'text-2xl font-bold'} mb-1 ${stat.textColor}`}
        style={stat.customTextColor ? { color: stat.customTextColor } : undefined}
      >
        {displayCount}
        {stat.suffix}
      </div>
      <div className={`text-sm ${stat.highlighted ? 'font-bold' : ''} text-gray-600`}>
        {stat.label}
      </div>
    </div>
  );
};

const AboutStats = () => {
  const stats: Stat[] = [
    { end: 250, suffix: '+', label: 'Dedicated Professionals', icon: Users, color: 'from-blue-50 to-white', borderColor: 'border-blue-100', iconBg: 'bg-blue-600', textColor: 'text-blue-600' },
    { end: 24, suffix: '/7', label: 'Operations', icon: Clock, color: 'from-indigo-50 to-white', borderColor: 'border-indigo-100', iconBg: 'bg-indigo-600', textColor: 'text-indigo-600' },
    { end: 5, suffix: ' Years', label: 'Industry Experience', icon: Calendar, color: 'from-cyan-50 to-white', borderColor: 'border-cyan-100', iconBg: 'bg-cyan-600', textColor: 'text-cyan-600' },
    { end: 200, suffix: '+', label: 'Happy Clients', icon: Award, color: 'from-red-50 to-white', borderColor: 'border-red-100', iconBg: 'var(--brand-red)', textColor: '', customTextColor: 'var(--brand-red)' },
    { end: 99.8, suffix: '%', label: 'On-Time Delivery', icon: CheckCircle2, color: 'from-green-50 to-white', borderColor: 'border-green-100', iconBg: 'bg-green-600', textColor: 'text-green-600', isDecimal: true },
    { end: 30, suffix: '%', label: 'Cost Saving vs Air Freight', icon: TrendingUp, color: 'from-purple-100 to-white', borderColor: 'border-purple-300 border-2', iconBg: 'bg-purple-600', textColor: 'text-purple-600', highlighted: true },
  ];

  return (
    <div className="mt-12 space-y-6">
      {/* First row - 1 item (highlighted) */}
      <div className="flex justify-center">
        <div className="w-full sm:w-96">
          <StatCard stat={stats[5]} index={5} />
        </div>
      </div>

      {/* Second row - 2 items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {stats.slice(3, 5).map((stat, index) => <StatCard key={stat.label} stat={stat} index={index + 3} />)}
      </div>

      {/* Third row - 3 items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {stats.slice(0, 3).map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}
      </div>
    </div>
  );
};

export default AboutStats;
