import { useRef } from 'react';
import { Building2, Car, Factory, Hospital, Palette, Ship, Tractor, Zap } from 'lucide-react';

const clients = [
    { name: 'Global Auto', icon: Car },
    { name: 'Tata Hitachi', icon: Factory },
    { name: 'Mindray', icon: Hospital },
    { name: 'ZIM Logistics', icon: Ship },
    { name: 'Mahindra', icon: Tractor },
    { name: 'Asian Paints', icon: Palette },
    { name: 'Godrej', icon: Building2 },
    { name: 'Reliance', icon: Zap },
];

const ClientLogos = () => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const renderClient = (client: (typeof clients)[number], key: string) => {
        const Icon = client.icon;
        return (
            <div
                key={key}
                className="flex-shrink-0 w-40 h-24 bg-white rounded-lg shadow-sm flex flex-col items-center justify-center gap-2 hover-scale transition-smooth border border-gray-200"
            >
                <Icon className="h-8 w-8 text-[#0b3572]" />
                <span className="text-sm font-medium text-gray-700">{client.name}</span>
            </div>
        );
    };

    return (
        <section className="py-16 px-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <h3 className="text-2xl font-bold text-center mb-8 text-gray-900">
                    Trusted by India's Leading Companies
                </h3>
                <div className="relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-10" />

                    <div className="flex gap-12 animate-scroll" ref={scrollRef}>
                        {clients.map((client, index) => renderClient(client, `first-${index}`))}
                        {clients.map((client, index) => renderClient(client, `second-${index}`))}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
        </section>
    );
};

export default ClientLogos;
