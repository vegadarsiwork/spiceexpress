import { useState, useEffect } from 'react';
import ScrollReveal from '../components/ScrollReveal';
import Modal from '../components/Modal';
import TrackingLight from '../components/TrackingLight';
import TrustBadges from '../components/TrustBadges';
import AboutStats from '../components/AboutStats';
import Carousel from '../components/Carousel';
import { Train, Truck, Shield, Settings, Users, Check } from 'lucide-react';
import { isAuthed } from '../lib/auth';
import { useRotatingText } from '../lib/animations';

const LandingPage = () => {
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const rotatingText = useRotatingText(['Next-Day Delivery Across India', 'Rail-Powered Logistics', '24/7 Nationwide Coverage']);

  // Hero carousel auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 6);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(isAuthed());
    };

    // Check on mount
    checkAuth();

    // Listen for auth state changes
    window.addEventListener('authStateChanged', checkAuth);
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('authStateChanged', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);
  // Zones and rate matrix (kept in-memory as requested)
  const ZONES = [
    { id: 'north1', label: 'North 1 — National Capital Region (Delhi)' },
    { id: 'north2', label: 'North 2 — Uttar Pradesh, Punjab, Haryana, HP, Rajasthan' },
    { id: 'west1', label: 'West 1 — Maharashtra (Mumbai, Pune)' },
    { id: 'west2', label: 'West 2 — Rest of Maharashtra, Goa, Gujarat' },
    { id: 'central', label: 'Central — Madhya Pradesh, Chhattisgarh' },
    { id: 'south1', label: 'South 1 — Karnataka, Chennai, Puducherry, Andhra Pradesh, Telangana' },
    { id: 'south2', label: 'South 2 — Tamil Nadu (Exc. Chennai), Kerala' },
    { id: 'east', label: 'East — West Bengal, Sikkim, Bihar, Orissa, Jharkhand' },
    { id: 'northeast', label: 'North East — Guwahati City' },
    { id: 'nepal', label: 'Nepal — As per Request' },
    { id: 'bangladesh', label: 'Bangladesh — As per Request' },
  ];

  // Rate matrix mapping from -> to (Rs per Kg)
  // Rows: north1, north2, west1, west2, central, south1, south2, east, northeast
  const RATE_MATRIX: Record<string, Record<string, number | null>> = {
    north1: { north1: null, north2: 25, west1: 45, west2: 48, central: 38, south1: 45, south2: 50, east: 40, northeast: 70, nepal: null, bangladesh: null },
    north2: { north1: 25, north2: null, west1: 25, west2: 25, central: 45, south1: 45, south2: 55, east: 45, northeast: 80, nepal: null, bangladesh: null },
    west1: { north1: 45, north2: 25, west1: null, west2: 46, central: 22, south1: 25, south2: 40, east: 35, northeast: 75, nepal: null, bangladesh: null },
    west2: { north1: 48, north2: 48, west1: 46, west2: null, central: 25, south1: 28, south2: 30, east: 30, northeast: 80, nepal: null, bangladesh: null },
    central: { north1: 38, north2: 45, west1: 22, west2: 25, central: null, south1: 30, south2: 25, east: 28, northeast: 75, nepal: null, bangladesh: null },
    south1: { north1: 45, north2: 45, west1: 25, west2: 28, central: 30, south1: null, south2: 20, east: 28, northeast: 80, nepal: null, bangladesh: null },
    south2: { north1: 50, north2: 55, west1: 40, west2: 30, central: 25, south1: 20, south2: null, east: 50, northeast: 25, nepal: null, bangladesh: null },
    east: { north1: 30, north2: 35, west1: 28, west2: 30, central: 26, south1: 28, south2: 25, east: null, northeast: 25, nepal: null, bangladesh: null },
    northeast: { north1: 70, north2: 80, west1: 75, west2: 80, central: 75, south1: 80, south2: 25, east: 25, northeast: null, nepal: null, bangladesh: null },
    nepal: { north1: null, north2: null, west1: null, west2: null, central: null, south1: null, south2: null, east: null, northeast: null, nepal: null, bangladesh: null },
    bangladesh: { north1: null, north2: null, west1: null, west2: null, central: null, south1: null, south2: null, east: null, northeast: null, nepal: null, bangladesh: null },
  };

  const [pickupZone, setPickupZone] = useState<string>('north1');
  const [dropZone, setDropZone] = useState<string>('north2');
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<number>(100);
  const [instantModalOpen, setInstantModalOpen] = useState(false);
  const [instantCalc, setInstantCalc] = useState<null | {
    perKgRate: number | null;
    freight: number | null;
    pickupCharge: number | null;
    deliveryCharge: number | null;
    grandTotal: number | null;
  }>(null);
  const AS_REQUEST_ZONES = new Set(['nepal', 'bangladesh']);

  const getRate = (fromId: string, toId: string) => {
    const from = RATE_MATRIX[fromId];
    if (!from) return null;
    const rate = from[toId as keyof typeof from];
    return typeof rate === 'number' ? rate : null;
  };

  const getPickupOrDeliveryCharge = (wt: number): number | null => {
    // slabs: 0-20:1800, 21-50:2500, 51-100:3500, 101-150:4500, Above 150: As actuals (null)
    if (wt > 3000) {
      // shipments above 3 tons => 2 Rs per Kg flat
      return Math.round(wt * 2);
    }
    if (wt <= 20) return 1800;
    if (wt <= 50) return 2500;
    if (wt <= 100) return 3500;
    if (wt <= 150) return 4500;
    return null; // As actuals
  };

  // Attach smooth scroll fallback and handle resize/scroll state
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      // find closest anchor
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') return;
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // close mobile menu if open
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };

    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      
      // Track active section based on viewport center
      const sections = ['home', 'about', 'services', 'contact'];
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      
      let currentSection = 'home';
      let minDistance = Infinity;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = window.scrollY + rect.top;
          const elementCenter = elementTop + rect.height / 2;
          const distance = Math.abs(viewportCenter - elementCenter);
          
          // Find the section whose center is closest to viewport center
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = section;
          }
        }
      }
      
      setActiveSection(currentSection);
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    // initialize states
    onResize();
    onScroll();

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
    };
  }, [isMobile, mobileMenuOpen, scrolled, isLoggedIn]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation - Unified sticky approach */}
      <nav className={isMobile ? "sticky top-0 z-50 w-full bg-white border-b border-gray-100 transition-smooth" : scrolled ? "fixed left-1/2 -translate-x-1/2 top-4 z-50 w-[95%] max-w-6xl glass-effect shadow-lg rounded-lg nav-slide-down" : "sticky top-0 z-50 w-full bg-white border-b border-gray-100 transition-smooth"}>
        <div className={isMobile ? "px-4 py-3 flex items-center justify-between" : scrolled ? "px-4 md:px-6 py-3 flex items-center justify-between w-full gap-4 flex-nowrap" : "max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between"}>
          <div className={isMobile || scrolled ? "flex items-center gap-3 flex-none" : "flex items-center gap-3 transition-smooth"}>
            <img src="/logotransparentbackground.png" alt="Spice Express Logo" className={scrolled && !isMobile ? "h-10 w-auto transition-smooth" : "h-12 w-auto transition-smooth"} />
          </div>
          <div className="hidden md:flex items-center gap-6 text-gray-800 font-medium flex-row flex-nowrap whitespace-nowrap">
            <a href="#" className="transition-smooth" style={{ color: '#1F2937' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>Home</a>
            <a href="#about" className="transition-smooth" style={{ color: '#1F2937' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>About</a>
            <a href="#services" className="transition-smooth" style={{ color: '#1F2937' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>Services</a>
            <a href="#contact" className="transition-smooth" style={{ color: '#1F2937' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>Contact</a>
          </div>
          <div className="hidden md:flex items-center flex-none">
            <a
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="px-8 py-2 rounded btn-smooth font-semibold text-white"
              style={{ backgroundColor: 'var(--brand-navy)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-navy-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow-navy)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-navy)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {isLoggedIn ? "Go to Dashboard" : "Login"}
            </a>
          </div>
          <div className="md:hidden flex items-center">
            <button aria-label="Toggle menu" onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-md focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'var(--brand-navy)' } as any}>
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav panel */}
      {mobileMenuOpen && isMobile && (
        <div className="sticky top-[60px] z-40 bg-white border-b border-gray-200 px-4 py-4 shadow-lg">
          <div className="flex flex-col gap-3">
            <a href="#" className="text-gray-800 font-medium py-2 transition-smooth" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>Home</a>
            <a href="#about" className="text-gray-800 font-medium py-2 transition-smooth" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>About</a>
            <a href="#services" className="text-gray-800 font-medium py-2 transition-smooth" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>Services</a>
            <a href="#contact" className="text-gray-800 font-medium py-2 transition-smooth" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-red)'} onMouseLeave={(e) => e.currentTarget.style.color = '#1F2937'}>Contact</a>
            <div className="pt-2 border-t border-gray-200">
              <a
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="w-full text-center px-4 py-3 rounded btn-smooth text-white font-semibold block"
                style={{ backgroundColor: 'var(--brand-navy)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-navy-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-navy)'}
              >
                {isLoggedIn ? "Go to Dashboard" : "Login"}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Small spacer for floating nav on desktop */ }
      {scrolled && !isMobile && <div className="h-20" />}

      {/* Scroll Progress Indicator */}
      {!isMobile && (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-6">
          {[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            { id: 'services', label: 'Services' },
            { id: 'contact', label: 'Contact' }
          ].map((section) => (
            <a
              key={section.id}
              href={`#${section.id === 'home' ? '' : section.id}`}
              className="group flex items-center justify-end gap-3"
            >
              <span
                className={`text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  activeSection === section.id
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'
                }`}
                style={{ color: activeSection === section.id ? 'var(--brand-navy)' : '#6B7280' }}
              >
                {section.label}
              </span>
              <div className="w-3 h-3 flex-shrink-0">
                <div
                  className={`w-full h-full rounded-full border-2 transition-all duration-300 ${
                    activeSection === section.id
                      ? 'scale-125 shadow-lg'
                      : 'scale-100 group-hover:scale-110'
                  }`}
                  style={{
                    borderColor: activeSection === section.id ? 'var(--brand-red)' : '#D1D5DB',
                    backgroundColor: activeSection === section.id ? 'var(--brand-red)' : 'white',
                    boxShadow: activeSection === section.id ? '0 0 8px rgba(220, 38, 38, 0.4)' : 'none'
                  }}
                />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Hero Section - Carousel as Background */ }
      <ScrollReveal y={isMobile ? 0 : 60} scale={isMobile ? 1 : 0.96}>
        <section id="home" className="w-full min-h-[95vh] flex flex-col items-center relative overflow-hidden">
          {/* Carousel Background - Full Screen */}
          <div className="absolute inset-0 w-full h-full">
            <div className="relative w-full h-full">
              {[
                '/train main page image 1.jpg',
                '/train main page image 2.jpeg',
                '/train main page image 3.jpg',
                '/train main page image 4.jpg',
                '/train main page image 5.jpg',
                '/train main page image 6.jpg'
              ].map((image, index) => (
                <div
                  key={index}
                  className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
                  style={{
                    opacity: index === currentSlide ? 1 : 0
                  }}
                >
                  <img
                    src={image}
                    alt={`Spice Express ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Overlay Gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>
          
          {/* Content Layer */}
          <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-center items-center min-h-[90vh] px-4 md:px-8 py-12 md:py-16 gap-8">
            {/* Top: Headline + Subheadline */}
            <div className="text-center space-y-4 md:space-y-6 mt-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl" style={{ lineHeight: 1.1, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                Delivering <span className="text-red-500">Speed</span>,<br className="hidden sm:block" />
                <span className="text-blue-300">Safety</span> & <span className="text-red-500">Trust</span>
              </h1>
              <div className="text-xl md:text-2xl lg:text-3xl font-semibold text-white drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
                <div className="relative h-10 md:h-12 lg:h-14 overflow-hidden">
                  <div 
                    key={rotatingText}
                    className="absolute inset-0 flex items-center justify-center animate-fade-in"
                  >
                    {rotatingText}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: CTA Section with form in modal/card style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
              {/* Quick Actions */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 card-hover flex flex-col items-center text-center border border-white/20">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: 'var(--brand-red)' }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--brand-navy)' }}>Track Shipment</h3>
                <p className="text-gray-600 text-sm mb-4">Real-time tracking for all your consignments</p>
                <button
                  onClick={() => setTrackingOpen(true)}
                  className="rounded-lg px-6 py-3 font-semibold text-white btn-smooth w-full shadow-lg"
                  style={{ backgroundColor: 'var(--brand-red)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-red-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-red)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Track Now →
                </button>
              </div>

              {/* Instant Quote - Center Card */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 card-hover flex flex-col items-center text-center border-2 border-white/40" style={{ borderColor: 'var(--brand-red)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: 'var(--brand-navy)' }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--brand-navy)' }}>Get Instant Quote</h3>
                <p className="text-gray-600 text-sm mb-4">Calculate your shipping costs instantly</p>
                <button
                  onClick={() => setQuoteModalOpen(true)}
                  className="rounded-lg px-6 py-3 font-semibold btn-smooth w-full text-white shadow-lg"
                  style={{ backgroundColor: 'var(--brand-navy)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-navy-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-navy)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Get Quote →
                </button>
              </div>

              {/* Contact Us */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 card-hover flex flex-col items-center text-center border border-white/20">
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Contact Us</h3>
                <p className="text-gray-600 text-sm mb-4">Speak with our logistics experts</p>
                <a
                  href="#contact"
                  className="rounded-lg px-6 py-3 font-semibold bg-green-600 text-white btn-smooth w-full hover:bg-green-700 shadow-lg transition-all"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Contact →
                </a>
              </div>
            </div>
          </div>

          {/* CSS Animation for Carousel */}
          <style>{`
            @keyframes carouselFade {
              0%, 20% { opacity: 1; }
              25%, 100% { opacity: 0; }
            }
          `}</style>
        </section>
      </ScrollReveal>

    {/* About Section - Redesigned to match reference image */ }
    <ScrollReveal y={50} scale={0.97}>
      <section id="about" className="py-20 px-6 max-w-3xl mx-auto text-center">
        <h3 className="text-4xl font-bold mb-2 text-gray-900">About Us</h3>
        <div className="text-xl font-semibold mb-8" style={{ color: 'var(--brand-red)' }}>India's premier rail-logistics solution since 2019.</div>
        <div className="flex justify-center mb-8">
          <Carousel
            images={[
              '/handling cargo 1.jpg',
              '/safe handling of material 1.jpg',
              '/handling cargo 4.jpg'
            ]}
            autoPlay={true}
            interval={4500}
            className="border-4 border-white shadow-lg w-full max-w-3xl"
            aspectRatio="h-64"
          />
        </div>
        <p className="mb-10 text-lg text-gray-800">Spice Express is India's premier rail-logistics solution. Since 2019, we've revolutionized cargo movement by harnessing the speed and reliability of India's rail network. With 250+ dedicated professionals, a nationwide footprint, and 24/7 operations, we deliver best-in-class logistics that keep businesses moving forward.</p>
        <AboutStats />
      </section>
    </ScrollReveal>
    {/* Trust Badges Section */ }
    <ScrollReveal y={40} scale={0.98}>
      <TrustBadges />
    </ScrollReveal>
    {/* Our Services Section - Redesigned to match reference image with Lucide icons */ }
    <ScrollReveal y={50} scale={0.97}>
      <section id="services" className="py-20 px-6 max-w-6xl mx-auto text-center">
        <h3 className="text-4xl font-bold mb-2 text-gray-900">Our Services</h3>
        <div className="text-lg mb-10 text-gray-700">Rail-powered logistics solutions designed to deliver speed, reliability, and cost efficiency for your business.</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left card-hover card-tilt animate-fade-in-up stagger-1 glow-on-hover">
            <Train className="w-8 h-8 mb-4" style={{ color: 'var(--brand-red)' }} />
            <div className="font-bold text-lg mb-2 text-gray-900">Intermodal Transport</div>
            <div className="text-gray-700 mb-4">Seamless rail-to-road integration for door-to-door delivery.</div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--brand-navy)' }}>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Rail Backbone</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Road Connectors</li>
            </ul>
          </div>
          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left card-hover card-tilt animate-fade-in-up stagger-2 glow-on-hover">
            <Truck className="w-8 h-8 mb-4" style={{ color: 'var(--brand-red)' }} />
            <div className="font-bold text-lg mb-2 text-gray-900">Last-Mile Delivery</div>
            <div className="text-gray-700 mb-4">Reliable last-mile services to reach every customer location.</div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--brand-navy)' }}>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Door-to-door</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Timely Delivery</li>
            </ul>
          </div>
          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left card-hover card-tilt animate-fade-in-up stagger-3 glow-on-hover">
            <Shield className="w-8 h-8 mb-4" style={{ color: 'var(--brand-red)' }} />
            <div className="font-bold text-lg mb-2 text-gray-900">Supervised Cargo Care</div>
            <div className="text-gray-700 mb-4">Every shipment handled under strict employee supervision.</div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--brand-navy)' }}>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Employee Supervision</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Secure Handling</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Quality Control</li>
            </ul>
          </div>
          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left card-hover card-tilt animate-fade-in-up stagger-4 glow-on-hover">
            <Settings className="w-8 h-8 mb-4" style={{ color: 'var(--brand-red)' }} />
            <div className="font-bold text-lg mb-2 text-gray-900">Tailored Solutions</div>
            <div className="text-gray-700 mb-4">Flexible offerings for FMCG, pharma, and manufacturing.</div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--brand-navy)' }}>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> FMCG Solutions</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Pharma Logistics</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Manufacturing</li>
            </ul>
          </div>
          {/* Card 5 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left card-hover card-tilt animate-fade-in-up stagger-5 glow-on-hover">
            <Users className="w-8 h-8 mb-4" style={{ color: 'var(--brand-red)' }} />
            <div className="font-bold text-lg mb-2 text-gray-900">Dedicated Account Management</div>
            <div className="text-gray-700 mb-4">Personalized support for high-volume clients.</div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--brand-navy)' }}>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Personal Support</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> High-Volume</li>
              <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Dedicated Team</li>
            </ul>
          </div>
        </div>
      </section>
    </ScrollReveal>
    {/* Our Capabilities Section - Image showcase with carousels */ }
    <ScrollReveal y={40} scale={0.98}>
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 text-center">Our <span style={{ color: 'var(--brand-red)' }}>Capabilities</span></h2>
        <p className="mb-12 text-lg text-gray-700 text-center max-w-3xl mx-auto">From door-to-door delivery to real-time tracking, we provide comprehensive logistics solutions tailored to your business needs.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Rail Transport Excellence */}
          <div className="bg-white rounded-2xl shadow-lg p-6 card-hover">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Rail Transport Excellence</h3>
            <Carousel
              images={[
                '/train image 1.jpg',
                '/train image 2.jpg',
                '/train image 3.jpg'
              ]}
              autoPlay={true}
              interval={4000}
              className="mb-4"
              aspectRatio="h-64"
            />
            <p className="text-gray-700">Leveraging India's extensive rail network for fast, efficient, and eco-friendly cargo transportation across the nation.</p>
          </div>

          {/* Door-to-Door Service */}
          <div className="bg-white rounded-2xl shadow-lg p-6 card-hover">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Door-to-Door Service</h3>
            <div className="mb-4 rounded-2xl overflow-hidden h-64">
              <img src="/door pickup and delivery 1.jpg" alt="Door to Door Delivery" className="w-full h-full object-cover" />
            </div>
            <p className="text-gray-700">Complete pickup and delivery services ensuring your cargo reaches its destination without hassle.</p>
          </div>

          {/* Road Services */}
          <div className="bg-white rounded-2xl shadow-lg p-6 card-hover">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Integrated Road Services</h3>
            <Carousel
              images={[
                '/road services also available.jpg',
                '/road services also available 1.jpg'
              ]}
              autoPlay={true}
              interval={4500}
              className="mb-4"
              aspectRatio="h-64"
            />
            <p className="text-gray-700">Seamless last-mile connectivity with our dedicated fleet of road transport vehicles.</p>
          </div>

          {/* Customized Solutions */}
          <div className="bg-white rounded-2xl shadow-lg p-6 card-hover">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Customized Solutions</h3>
            <div className="mb-4 rounded-2xl overflow-hidden h-64">
              <img src="/customised solutions for your transportation needs.jpg" alt="Customized Solutions" className="w-full h-full object-cover" />
            </div>
            <p className="text-gray-700">Tailored logistics solutions designed to meet your unique business requirements and challenges.</p>
          </div>
        </div>

        {/* POD Updates */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-lg p-8 card-hover">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Real-Time POD Updates</h3>
              <p className="text-lg text-gray-700 mb-4">Stay informed with timely Proof of Delivery updates directly on our portal. Track every milestone of your shipment journey with complete transparency.</p>
              <ul className="space-y-2 text-gray-800">
                <li className="flex items-center gap-2"><Check className="w-5 h-5" style={{ color: 'var(--brand-red)' }} /> Instant notification on delivery</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5" style={{ color: 'var(--brand-red)' }} /> Digital POD documentation</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5" style={{ color: 'var(--brand-red)' }} /> Real-time status tracking</li>
                <li className="flex items-center gap-2"><Check className="w-5 h-5" style={{ color: 'var(--brand-red)' }} /> Complete shipment visibility</li>
              </ul>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <Carousel
                images={[
                  '/proof of delivery updation 1.jpg',
                  '/proof of delivery updation 2.jpg'
                ]}
                autoPlay={true}
                interval={4000}
                aspectRatio="h-80"
              />
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
    {/* Why Choose Spice Express Section - Matches reference image */ }
    <ScrollReveal y={40} scale={0.98}>
      <section className="py-20 px-6 max-w-7xl mx-auto text-center" style={{ background: 'linear-gradient(135deg, #F9FAFB 0%, #E6F0FF 100%)' }}>
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Why Choose <span style={{ color: 'var(--brand-red)' }}>Spice Express</span>?</h2>
        <p className="mb-10 text-lg text-gray-700">Experience the power of rail logistics with India's most innovative transportation solutions.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Speed & Reliability</div>
            <div className="text-gray-700 text-sm">Next-day delivery via rail.</div>
          </div>
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="6" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Door-to-Door Convenience</div>
            <div className="text-gray-700 text-sm">Rail backbone with integrated road legs.</div>
          </div>
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2v20" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Pan-India Coverage</div>
            <div className="text-gray-700 text-sm">Networked presence with 24/7 operations.</div>
          </div>
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 3h8" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Smart Technology Platform</div>
            <div className="text-gray-700 text-sm">Advanced tracking and visibility.</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Cost Efficiency</div>
            <div className="text-gray-700 text-sm">Affordable alternative to air freight.</div>
          </div>
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8z" /><path d="M12 8v4l3 3" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Sustainability</div>
            <div className="text-gray-700 text-sm">Rail freight emits far less CO₂ than road.</div>
          </div>
          <div className="flex flex-col items-center hover-scale">
            <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4 transition-smooth" style={{ color: 'var(--brand-red)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </span>
            <div className="font-bold text-lg mb-1 text-gray-900">Industry Leadership</div>
            <div className="text-gray-700 text-sm">Setting new standards in rail logistics since 2019.</div>
          </div>
        </div>
      </section>
    </ScrollReveal>
    {/* Smart Dashboards, Smarter Logistics Section - Matches reference image */ }
    <ScrollReveal y={40} scale={0.98}>
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: Headline, subheadline, features */}
        <div className="flex flex-col justify-center items-start">
          <h2 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900">Smart <span style={{ color: 'var(--brand-red)' }}>Dashboards</span>,<br /><span style={{ color: 'var(--brand-navy)' }}>Smarter Logistics</span></h2>
          <p className="mb-2 text-lg text-gray-700">Experience next-generation logistics management with our unified dashboard platform.</p>
          <p className="mb-8 text-gray-700">Instant tracking, seamless invoice management, and complete shipment visibility across web and mobile devices.</p>
          <div className="flex flex-col gap-4 w-full mb-6">
            <div className="flex items-center gap-4 rounded-xl p-4 shadow-sm card-hover" style={{ backgroundColor: '#E6F0FF' }}>
              <span className="rounded-full w-10 h-10 flex items-center justify-center text-xl text-white" style={{ backgroundColor: 'var(--brand-navy)' }}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
              <div>
                <div className="font-bold text-lg" style={{ color: 'var(--brand-navy)' }}>Instant Tracking</div>
                <div className="text-gray-700 text-sm">Real-time shipment status with interactive progress bars, detailed map views, and comprehensive timeline tracking for complete visibility.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl p-4 shadow-sm card-hover" style={{ backgroundColor: '#FEF2F2' }}>
              <span className="rounded-full w-10 h-10 flex items-center justify-center text-xl text-white" style={{ backgroundColor: 'var(--brand-red)' }}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="6" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
              <div>
                <div className="font-bold text-lg" style={{ color: 'var(--brand-red)' }}>LR & Invoice Management</div>
                <div className="text-gray-700 text-sm">One-click access to download invoices and LR documents instantly. Streamlined billing with organized digital documentation.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4 shadow-sm card-hover">
              <span className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 3h8" /></svg></span>
              <div>
                <div className="font-bold text-green-700 text-lg">Customer Dashboard</div>
                <div className="text-gray-700 text-sm">Comprehensive overview of all shipments in elegant cards and tables. Monitor multiple consignments at a single glance.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-purple-50 rounded-xl p-4 shadow-sm card-hover">
              <span className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 3h8" /></svg></span>
              <div>
                <div className="font-bold text-purple-700 text-lg">Mobile + Desktop Access</div>
                <div className="text-gray-700 text-sm">Seamless experience across all devices. Access your dashboard from desktop, tablet, or mobile with synchronized data everywhere.</div>
              </div>
            </div>
          </div>
        </div>
        {/* Right: Dashboard image */}
        <div className="flex items-center justify-center relative">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 flex flex-col items-center justify-center animate-float">
            <div className="absolute top-6 right-6 bg-white rounded-full px-4 py-2 shadow text-green-600 font-semibold text-sm flex items-center gap-2">● Live Tracking</div>
            <img src="/dashboard.png" alt="Spice Express Dashboard" className="w-full h-80 object-cover rounded-2xl mb-2" />
            <div className="absolute bottom-6 left-6 bg-white rounded-full px-4 py-2 shadow text-gray-700 font-semibold text-sm flex items-center gap-2">🚚 2,847 Active</div>
          </div>
        </div>
      </section>
    </ScrollReveal>
    {/* Testimonials Section */ }
    <ScrollReveal y={30} scale={0.99}>
      <section className="py-16 px-6 max-w-5xl mx-auto text-center">
        <h3 className="text-2xl font-bold mb-8 text-gray-900">What Our Clients Say</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-yellow-400 text-2xl mb-2">★★★★★</div>
            <div className="text-gray-900 font-semibold mb-2">"Next-day delivery is always reliable!"</div>
            <div className="text-gray-700 text-sm">— Global Auto</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-yellow-400 text-2xl mb-2">★★★★★</div>
            <div className="text-gray-900 font-semibold mb-2">"Spice Express provides tracking visibility for every shipment."</div>
            <div className="text-gray-700 text-sm">— Tata Hitachi</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-yellow-400 text-2xl mb-2">★★★★★</div>
            <div className="text-gray-900 font-semibold mb-2">"24/7 support and proactive updates are so convenient!"</div>
            <div className="text-gray-700 text-sm">— Mindray</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-yellow-400 text-2xl mb-2">★★★★★</div>
            <div className="text-gray-900 font-semibold mb-2">"I can track each shipment across India with real results."</div>
            <div className="text-gray-700 text-sm">— ZIM Logistics</div>
          </div>
        </div>
      </section>
    </ScrollReveal>
    {/* Partners Section */ }
    <ScrollReveal y={40} scale={0.98}>
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 text-gray-900">Proud logistics partner for:</h3>
        <div className="w-full overflow-hidden relative">
          <div className="mx-auto" style={{ width: 'calc(5 * 10rem + 4 * 2.5rem)' }}>
            <div
              className="flex items-center gap-10 animate-marquee whitespace-nowrap"
              style={{ animation: 'marquee 20s linear infinite' }}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="w-40 h-24 bg-gray-200 rounded flex items-center justify-center">Logo {i + 1}</div>
              ))}
              {/* Duplicate for seamless loop */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={`dup-${i}`} className="w-40 h-24 bg-gray-200 rounded flex items-center justify-center">Logo {i + 1}</div>
              ))}
            </div>
          </div>
          {/* Marquee animation keyframes */}
          <style>{`
              @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
        </div>
      </section>
    </ScrollReveal>

    {/* Green CTA Bar */}
    <ScrollReveal y={20} scale={0.99}>
      <section className="py-4 bg-green-700 text-white text-center">
        <span className="font-semibold">🚄 Eco-friendly rail logistics: choose a greener supply chain.</span>
      </section>
    </ScrollReveal>

    {/* CTA Section */}
    <ScrollReveal y={40} scale={0.98}>
      <section className="py-12 text-white text-center" style={{ backgroundColor: 'var(--brand-navy-hover)' }}>
        <h3 className="text-2xl font-bold mb-2 text-white">Ready to Ship with Us?</h3>
        <p className="mb-4 text-white">Join thousands of satisfied customers who trust Spice Express for their logistics needs.</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-4">
          <a href="#" className="px-6 py-3 rounded font-semibold text-white btn-smooth" style={{ backgroundColor: 'var(--brand-red)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-red-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow-red)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-red)'; e.currentTarget.style.boxShadow = ''; }}>Get Instant Quote</a>
          <button
            className="px-6 py-3 rounded bg-white font-semibold btn-smooth"
            style={{ color: 'var(--brand-navy)', borderWidth: '2px', borderColor: 'white' }}
            onClick={() => setTrackingOpen(true)}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E6F0FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            Track Your Shipment
          </button>
        </div>
      </section>
    </ScrollReveal>

    {/* Modals - Moved outside of sections */}
    <Modal open={trackingOpen} onClose={() => setTrackingOpen(false)} lightMode={true}>
      <TrackingLight />
    </Modal>

    <Modal open={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} lightMode={true}>
      <div className="p-6 md:p-8 max-w-2xl">
        <h3 className="text-3xl md:text-4xl font-bold mb-2 text-center" style={{ color: 'var(--brand-navy)' }}>Get Your Instant Fare Price</h3>
        <p className="text-gray-600 text-center mb-6">Calculate shipping costs across India in seconds</p>
        <form
          className="flex flex-col gap-4 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            // validate zones
            if (pickupZone === dropZone) {
              setZoneError('Pickup and Drop cannot be the same location.');
              return;
            }
            setZoneError(null);
            // failsafe: zones that are "As per Request" are not supported in instant calculator
            if (AS_REQUEST_ZONES.has(pickupZone) || AS_REQUEST_ZONES.has(dropZone)) {
              setZoneError('As per request not available in instant fare calculator!');
              return;
            }
            // compute instant rate if available
            const rate = getRate(pickupZone, dropZone);
            const pickupCharge = getPickupOrDeliveryCharge(weightKg);
            const deliveryCharge = getPickupOrDeliveryCharge(weightKg);
            const freight = rate ? Math.round(rate * weightKg) : null;
            const grandTotal = freight !== null ? freight + (pickupCharge || 0) + (deliveryCharge || 0) : null;
            setInstantCalc({ perKgRate: rate, freight, pickupCharge, deliveryCharge, grandTotal });
            setQuoteModalOpen(false);
            setInstantModalOpen(true);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Pickup Zone</label>
              <select value={pickupZone} onChange={(e) => setPickupZone(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-medium transition-smooth cursor-pointer w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Drop Zone</label>
              <select value={dropZone} onChange={(e) => setDropZone(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-medium transition-smooth cursor-pointer w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Weight (Kg)</label>
            <input type="number" min={1} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value || 0))} className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-medium transition-smooth w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          {zoneError && <div className="text-sm font-semibold bg-red-50 border border-red-200 rounded-lg p-3" style={{ color: 'var(--brand-red)' }}>{zoneError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 font-medium transition-smooth focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Your Name" />
            <input type="tel" className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 font-medium transition-smooth focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Phone Number" />
          </div>
          <select className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-medium transition-smooth cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">What best describes you?</option>
            <option value="business">Business</option>
            <option value="individual">Individual</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-3 mt-4">
            <button 
              type="button"
              onClick={() => setQuoteModalOpen(false)}
              className="rounded-lg px-6 py-3 font-semibold text-gray-700 btn-smooth flex-1 border-2 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="rounded-lg px-6 py-3 font-bold text-lg flex items-center justify-center gap-2 transition-smooth flex-1 shadow-lg text-white btn-smooth" 
              style={{ backgroundColor: 'var(--brand-navy)' }} 
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-navy-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow-navy)'; }} 
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-navy)'; e.currentTarget.style.boxShadow = ''; }}
            >
              Calculate Fare <span className="ml-1">→</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>

    <Modal open={instantModalOpen} onClose={() => setInstantModalOpen(false)} lightMode={true}>
      <div className="p-6 max-w-lg">
        <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-navy)' }}>Instant Fare Estimate</h3>
        {instantCalc ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Per Kg Rate</div>
                  <div className="font-bold text-lg" style={{ color: 'var(--brand-navy)' }}>
                    {instantCalc.perKgRate ? `₹${instantCalc.perKgRate}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Weight</div>
                  <div className="font-bold text-lg">{weightKg} Kg</div>
                </div>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Freight Charges:</span>
                <span className="font-semibold">{instantCalc.freight !== null ? `₹${instantCalc.freight}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Pickup Charge:</span>
                <span className="font-semibold">{instantCalc.pickupCharge !== null ? `₹${instantCalc.pickupCharge}` : 'As actuals'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Delivery Charge:</span>
                <span className="font-semibold">{instantCalc.deliveryCharge !== null ? `₹${instantCalc.deliveryCharge}` : 'As actuals'}</span>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold" style={{ color: 'var(--brand-navy)' }}>Grand Total:</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--brand-red)' }}>
                  {instantCalc.grandTotal !== null ? `₹${instantCalc.grandTotal}` : 'As actuals'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700">Calculation not available.</div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={() => setInstantModalOpen(false)} 
            className="px-6 py-2 rounded-lg font-semibold text-white btn-smooth" 
            style={{ backgroundColor: 'var(--brand-navy)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-navy-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-navy)'}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>

    {/* Footer */}
    <ScrollReveal y={30} scale={0.99}>
      <footer id="contact" className="text-neutral-100 pt-10 pb-4 mt-0 scroll-mt-28" style={{ backgroundColor: 'var(--brand-navy-hover)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
          {/* Company Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-2">
              <div>
                <span className="font-bold text-xl text-white">Spice Express</span>
                <div className="text-sm text-neutral-300">Logistics Company</div>
              </div>
            </div>
            <div className="text-sm text-neutral-300 mb-2">India's premier rail-logistics solution since 2019. Revolutionizing cargo movement with the speed and reliability of India's rail network.</div>
            <div className="flex gap-3 mt-2 text-neutral-400">
              <a href="#" aria-label="Facebook" className="transition-smooth hover-scale"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .6 23.4 0 22.675 0" /></svg></a>
              <a href="#" aria-label="Twitter" className="transition-smooth hover-scale"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 01-2.828.775 4.932 4.932 0 002.165-2.724c-.951.555-2.005.959-3.127 1.184A4.92 4.92 0 0016.616 3c-2.717 0-4.92 2.206-4.92 4.917 0 .386.044.762.127 1.124C7.691 8.84 4.066 6.884 1.64 3.94c-.423.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 01-2.229-.616c-.054 1.997 1.397 3.872 3.448 4.292a4.936 4.936 0 01-2.224.084c.627 1.956 2.444 3.377 4.6 3.418A9.867 9.867 0 010 21.543a13.94 13.94 0 007.548 2.212c9.058 0 14.009-7.513 14.009-14.009 0-.213-.005-.425-.014-.636A10.025 10.025 0 0024 4.557z" /></svg></a>
              <a href="#" aria-label="LinkedIn" className="transition-smooth hover-scale"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.601 2.001 3.601 4.601v5.595z" /></svg></a>
              <a href="#" aria-label="Instagram" className="transition-smooth hover-scale"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.974 1.246 2.242 1.308 3.608.058 1.266.069 1.646.069 4.85s-.011 3.584-.069 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.975-2.242 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.011-4.85-.069c-1.366-.062-2.633-.334-3.608-1.308-.975-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.981-.981 2.093-1.264 3.374-1.323C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.414 3.678 1.395c-.98.98-1.263 2.092-1.322 3.373C2.013 5.668 2 6.077 2 12c0 5.923.013 6.332.072 7.612.059 1.281.342 2.393 1.322 3.373.981.981 2.093 1.264 3.374 1.323C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.281-.059 2.393-.342 3.374-1.323.98-.98 1.263-2.092 1.322-3.373.059-1.28.072-1.689.072-7.612 0-5.923-.013-6.332-.072-7.612-.059-1.281-.342-2.393-1.322-3.373-.981-.981-2.093-1.264-3.374-1.323C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" /></svg></a>
            </div>
          </div>
          {/* Quick Links */}
          <div>
            <div className="font-bold mb-2">Quick Links</div>
            <ul className="text-sm space-y-1">
              <li><a href="#about" className="hover:underline transition-smooth">About Us</a></li>
              <li><a href="#services" className="hover:underline transition-smooth">Our Services</a></li>
              <li><a href="#track" className="hover:underline transition-smooth">Track Shipment</a></li>
              <li><a href="#quote" className="hover:underline transition-smooth">Get Quote</a></li>
              <li><a href="#portal" className="hover:underline transition-smooth">Customer Portal</a></li>
            </ul>
          </div>
          {/* Contact Info */}
          <div>
            <div className="font-bold mb-2">Contact</div>
            <div className="flex flex-col gap-1 text-sm text-neutral-300">
              <div className="flex items-start gap-2"><svg className="w-4 h-4 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6c0 4.418-6 10-6 10S4 12.418 4 8a6 6 0 016-6zm0 8a2 2 0 100-4 2 2 0 000 4z" /></svg> D-42, Martin Nagar, Nara Road<br />Jaripatka, Nagpur-440014</div>
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3.5A1.5 1.5 0 013.5 2h13A1.5 1.5 0 0118 3.5v13A1.5 1.5 0 0116.5 18h-13A1.5 1.5 0 012 16.5v-13zM4 4v12h12V4H4zm2 2h8v8H6V6z" /></svg> 7773952909<br />9921065387</div>
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2.94 6.94a1.5 1.5 0 012.12 0l7.07 7.07a1.5 1.5 0 01-2.12 2.12l-7.07-7.07a1.5 1.5 0 010-2.12z" /></svg> julie.douglas@spiceexpress.co.in</div>
              <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" /></svg> www.spiceexpress.in</div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-400 px-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span>© 2024 Spice Express & Logistics Company. All rights reserved.</span>
          <div className="flex gap-4 mt-2 md:mt-0">
            <a href="#" className="hover:underline transition-smooth">Privacy Policy</a>
            <a href="#" className="hover:underline transition-smooth">Terms of Service</a>
            <a href="#" className="hover:underline transition-smooth">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </ScrollReveal>
  </div>
  );
};

export default LandingPage;
