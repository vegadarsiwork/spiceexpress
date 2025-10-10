import { useState, useEffect } from 'react';
import Cursor from '../components/Cursor';
import ScrollReveal from '../components/ScrollReveal';
import Modal from '../components/Modal';
import Tracking from './Tracking';
import { Train, Truck, Shield, Settings, Users, Check } from 'lucide-react';
import { isAuthed } from '../lib/auth';

const LandingPage = () => {
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    const onScroll = () => setScrolled(window.scrollY > 24);

    document.addEventListener('click', handleClick);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    // initialize states
    onResize();
    onScroll();

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll as any);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="bg-white flex flex-col relative">
      <Cursor />
      {/* Navbar */}
      {(!scrolled && !isMobile) ? (
        <nav className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 transition-[height,transform] duration-300 ease-out">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between transition-[transform] duration-300">
            <div className="flex items-center gap-2 transition-all duration-300">
              <img src="/logo.png" alt="Spice Express Logo" className="w-10 h-10 rounded-full transition-all duration-300" />
              <span className="font-bold text-lg text-red-700">Spice Express</span>
            </div>
            <div className="flex gap-6 text-gray-800 font-medium">
              <a href="#" className="hover:text-red-600 text-gray-800">Home</a>
              <a href="#about" className="hover:text-red-600 text-gray-800">About</a>
              <a href="#services" className="hover:text-red-600 text-gray-800">Services</a>
              <a href="#contact" className="hover:text-red-600 text-gray-800">Contact</a>
            </div>
            <div className="flex">
              <a 
                href={isLoggedIn ? "/dashboard" : "/login"} 
                className="px-8 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                {isLoggedIn ? "Go to Dashboard" : "Login"}
              </a>
            </div>
          </div>
        </nav>
      ) : (
        <>
          <nav className={isMobile ? "sticky top-0 z-50 w-full bg-white border-b border-gray-100" : "fixed left-1/2 -translate-x-1/2 top-4 z-40 w-[95%] max-w-6xl bg-white/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-100 transition-[transform,opacity] duration-300"}>
            <div className={isMobile ? "px-4 py-3 flex items-center justify-between" : "px-4 md:px-6 py-3 md:py-4 flex items-center justify-between w-full gap-4 flex-nowrap"}>
              <div className="flex items-center gap-2 flex-none">
                <img src="/logo.png" alt="Spice Express Logo" className="w-8 h-8 rounded-full transition-all duration-300" />
                <span className="font-bold text-base text-red-700">Spice Express</span>
              </div>
              <div className="hidden md:flex items-center gap-6 text-gray-800 font-medium flex-row flex-nowrap whitespace-nowrap">
                <a href="#" className="hover:text-red-600">Home</a>
                <a href="#about" className="hover:text-red-600">About</a>
                <a href="#services" className="hover:text-red-600">Services</a>
                <a href="#contact" className="hover:text-red-600">Contact</a>
              </div>
              <div className="hidden md:flex items-center flex-none">
                <a 
                  href={isLoggedIn ? "/dashboard" : "/login"} 
                  className="px-8 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  {isLoggedIn ? "Go to Dashboard" : "Login"}
                </a>
              </div>
              <div className="md:hidden flex items-center">
                <button aria-label="Toggle menu" onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600">
                  <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
                </button>
              </div>
            </div>
          </nav>
          
          {/* Mobile nav panel - outside of ScrollReveal for proper positioning */}
          {mobileMenuOpen && isMobile && (
            <div className="sticky top-[60px] z-40 bg-white border-b border-gray-200 px-4 py-4 shadow-lg">
              <div className="flex flex-col gap-3">
                <a href="#" className="text-gray-800 font-medium py-2 hover:text-red-600">Home</a>
                <a href="#about" className="text-gray-800 font-medium py-2 hover:text-red-600">About</a>
                <a href="#services" className="text-gray-800 font-medium py-2 hover:text-red-600">Services</a>
                <a href="#contact" className="text-gray-800 font-medium py-2 hover:text-red-600">Contact</a>
                <div className="pt-2 border-t border-gray-200">
                  <a 
                    href={isLoggedIn ? "/dashboard" : "/login"} 
                    className="w-full text-center px-4 py-3 rounded bg-red-600 text-white font-semibold block hover:bg-red-700"
                  >
                    {isLoggedIn ? "Go to Dashboard" : "Login"}
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
  {/* spacer: fixed height equal to the largest navbar height to avoid page jump */}
  <div className="h-20 md:h-20" />

  {/* Hero Section - Mimics reference image exactly */}
      <ScrollReveal y={isMobile ? 0 : 60} scale={isMobile ? 1 : 0.96}>
        <section className="w-full min-h-[70vh] flex flex-col items-center px-4 md:px-12 py-10 md:py-20 bg-white">
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-center gap-10 md:gap-24">
          {/* Left Panel: Headline + Image */}
          <div className="flex-1 flex flex-col justify-center items-start gap-4 md:gap-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight mb-2 md:mb-4 text-center md:text-left" style={{lineHeight:1.05}}>
              Delivering <span className="text-red-600">Speed</span>,<br/>
              <span className="text-orange-500">Safety</span> & <span className="text-red-500">Trust</span>
            </h1>
            <div className="w-full max-w-xl h-48 sm:h-56 md:h-72 bg-white rounded-2xl shadow-xl mb-0 overflow-hidden flex items-center justify-center">
              <img src="/hero.png" alt="Spice Express Fleet" className="w-full h-full object-cover rounded-2xl" />
            </div>
          </div>
          {/* Right Panel: Form + Buttons */}
          <div className="flex-1 flex flex-col items-center justify-center md:pl-12 w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 w-full max-w-md flex flex-col items-center border border-gray-100">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-blue-700 text-center">Get Your Instant Fare Price</h3>
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
                  setInstantModalOpen(true);
                }}
              >
                <label className="text-sm font-medium">Pickup Zone</label>
                <select value={pickupZone} onChange={(e) => setPickupZone(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
                <label className="text-sm font-medium">Drop Zone</label>
                <select value={dropZone} onChange={(e) => setDropZone(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
                <label className="text-sm font-medium">Weight (Kg)</label>
                <input type="number" min={1} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value || 0))} className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {zoneError && <div className="text-sm text-red-600 font-medium">{zoneError}</div>}
                <input className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Name" />
                <input className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone Number" />
                <select className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">What best describes you?</option>
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                  <option value="other">Other</option>
                </select>
                <button className="bg-blue-700 text-white rounded-lg px-4 py-3 font-bold text-lg mt-2 flex items-center justify-center gap-2 hover:bg-blue-800 transition w-full shadow">
                  Get Fare Estimate <span className="ml-1">→</span>
                </button>
              </form>
              <div className="flex flex-col md:flex-row gap-4 mt-6 w-full justify-center">
                <button
                  className="bg-red-600 text-white rounded-lg px-6 py-3 font-bold text-lg shadow hover:bg-red-700 transition flex items-center gap-2 w-full md:w-auto"
                  onClick={() => setTrackingOpen(true)}
                >
                  Track Shipment
                </button>
                <button
                  className="bg-white border border-red-600 text-red-600 rounded-lg px-6 py-3 font-bold text-lg shadow hover:bg-red-50 transition flex items-center gap-2 w-full md:w-auto"
                >
                  Get Instant Quote
                </button>
              </div>
            </div>
          </div>
          </div>
        </section>
      </ScrollReveal>
      {/* Instant Rate Modal */}
      <Modal open={instantModalOpen} onClose={() => setInstantModalOpen(false)}>
        <div className="p-6 max-w-lg">
          <h3 className="text-2xl font-bold mb-4">Instant Fare Estimate</h3>
          {instantCalc ? (
            <div className="text-sm text-gray-800">
              <div className="mb-2">Per Kg Rate: {instantCalc.perKgRate ? `Rs ${instantCalc.perKgRate}` : 'N/A'}</div>
              <div className="mb-2">Freight ({weightKg} Kg): {instantCalc.freight !== null ? `Rs ${instantCalc.freight}` : 'N/A'}</div>
              <div className="mb-2">Pickup Charge: {instantCalc.pickupCharge !== null ? `Rs ${instantCalc.pickupCharge}` : 'As actuals'}</div>
              <div className="mb-2">Delivery Charge: {instantCalc.deliveryCharge !== null ? `Rs ${instantCalc.deliveryCharge}` : 'As actuals'}</div>
              <div className="font-semibold text-lg mt-3">Grand Total: {instantCalc.grandTotal !== null ? `Rs ${instantCalc.grandTotal}` : 'As actuals'}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-700">Calculation not available.</div>
          )}
          <div className="mt-6 flex justify-end">
            <button onClick={() => setInstantModalOpen(false)} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button>
          </div>
        </div>
      </Modal>
      {/* About Section - Redesigned to match reference image */}
      <ScrollReveal y={50} scale={0.97}>
        <section id="about" className="py-20 px-6 max-w-3xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-2 text-gray-900">About Us</h3>
          <div className="text-xl font-semibold mb-8 text-red-600">India's premier rail-logistics solution since 2019.</div>
          <div className="flex justify-center mb-8">
            <img src="/aboutus.png" alt="Spice Express About" className="rounded-2xl shadow-lg border-4 border-white w-full max-w-3xl h-64 object-cover" />
          </div>
          <p className="mb-10 text-lg text-gray-800">Spice Express is India's premier rail-logistics solution. Since 2019, we've revolutionized cargo movement by harnessing the speed and reliability of India's rail network. With 250+ dedicated professionals, a nationwide footprint, and 24/7 operations, we deliver best-in-class logistics that keep businesses moving forward.</p>
          <div className="flex flex-col md:flex-row gap-6 justify-center mb-10">
            <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px]">
              <div className="text-3xl font-bold text-red-600 mb-2">2019</div>
              <div className="text-gray-700 text-sm">Industry Leadership</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px]">
              <div className="text-3xl font-bold text-red-600 mb-2">250+</div>
              <div className="text-gray-700 text-sm">Dedicated Professionals</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px]">
              <div className="text-3xl font-bold text-red-600 mb-2">24/7</div>
              <div className="text-gray-700 text-sm">Operations</div>
            </div>
          </div>
        </section>
      </ScrollReveal>
      {/* Our Services Section - Redesigned to match reference image with Lucide icons */}
      <ScrollReveal y={50} scale={0.97}>
        <section id="services" className="py-20 px-6 max-w-6xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-2 text-gray-900">Our Services</h3>
          <div className="text-lg mb-10 text-gray-700">Rail-powered logistics solutions designed to deliver speed, reliability, and cost efficiency for your business.</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left">
              <Train className="text-red-600 w-8 h-8 mb-4" />
              <div className="font-bold text-lg mb-2 text-gray-900">Intermodal Transport</div>
              <div className="text-gray-700 mb-4">Seamless rail-to-road integration for door-to-door delivery.</div>
              <ul className="text-green-600 text-sm space-y-1">
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Rail Backbone</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Road Connectors</li>
              </ul>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left">
              <Truck className="text-red-600 w-8 h-8 mb-4" />
              <div className="font-bold text-lg mb-2 text-gray-900">Last-Mile Delivery</div>
              <div className="text-gray-700 mb-4">Reliable last-mile services to reach every customer location.</div>
              <ul className="text-green-600 text-sm space-y-1">
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Door-to-door</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Timely Delivery</li>
              </ul>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left">
              <Shield className="text-red-600 w-8 h-8 mb-4" />
              <div className="font-bold text-lg mb-2 text-gray-900">Supervised Cargo Care</div>
              <div className="text-gray-700 mb-4">Every shipment handled under strict employee supervision.</div>
              <ul className="text-green-600 text-sm space-y-1">
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Employee Supervision</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Secure Handling</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Quality Control</li>
              </ul>
            </div>
            {/* Card 4 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left">
              <Settings className="text-red-600 w-8 h-8 mb-4" />
              <div className="font-bold text-lg mb-2 text-gray-900">Tailored Solutions</div>
              <div className="text-gray-700 mb-4">Flexible offerings for FMCG, pharma, and manufacturing.</div>
              <ul className="text-green-600 text-sm space-y-1">
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> FMCG Solutions</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Pharma Logistics</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Manufacturing</li>
              </ul>
            </div>
            {/* Card 5 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-8 flex flex-col items-start text-left">
              <Users className="text-red-600 w-8 h-8 mb-4" />
              <div className="font-bold text-lg mb-2 text-gray-900">Dedicated Account Management</div>
              <div className="text-gray-700 mb-4">Personalized support for high-volume clients.</div>
              <ul className="text-green-600 text-sm space-y-1">
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Personal Support</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> High-Volume</li>
                <li className="flex items-center gap-1"><Check className="inline w-4 h-4" /> Dedicated Team</li>
              </ul>
            </div>
          </div>
        </section>
      </ScrollReveal>
      {/* Why Choose Spice Express Section - Matches reference image */}
      <ScrollReveal y={40} scale={0.98}>
        <section className="py-20 px-6 max-w-7xl mx-auto text-center bg-gray-50">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Why Choose <span className="text-red-600">Spice Express</span>?</h2>
          <p className="mb-10 text-lg text-gray-700">Experience the power of rail logistics with India's most innovative transportation solutions.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Speed & Reliability</div>
              <div className="text-gray-700 text-sm">Next-day delivery via rail.</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Door-to-Door Convenience</div>
              <div className="text-gray-700 text-sm">Rail backbone with integrated road legs.</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Pan-India Coverage</div>
              <div className="text-gray-700 text-sm">Networked presence with 24/7 operations.</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 3h8"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Smart Technology Platform</div>
              <div className="text-gray-700 text-sm">Advanced tracking and visibility.</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Cost Efficiency</div>
              <div className="text-gray-700 text-sm">Affordable alternative to air freight.</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8z"/><path d="M12 8v4l3 3"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Sustainability</div>
              <div className="text-gray-700 text-sm">Rail freight emits far less CO₂ than road.</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-white rounded-full shadow-lg flex items-center justify-center w-20 h-20 mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </span>
              <div className="font-bold text-lg mb-1 text-gray-900">Industry Leadership</div>
              <div className="text-gray-700 text-sm">Setting new standards in rail logistics since 2019.</div>
            </div>
          </div>
        </section>
      </ScrollReveal>
      {/* Smart Dashboards, Smarter Logistics Section - Matches reference image */}
      <ScrollReveal y={40} scale={0.98}>
        <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Headline, subheadline, features */}
          <div className="flex flex-col justify-center items-start">
            <h2 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900">Smart <span className="text-red-600">Dashboards</span>,<br/><span className="text-orange-500">Smarter Logistics</span></h2>
            <p className="mb-2 text-lg text-gray-700">Experience next-generation logistics management with our unified dashboard platform.</p>
            <p className="mb-8 text-gray-700">Instant tracking, seamless invoice management, and complete shipment visibility across web and mobile devices.</p>
            <div className="flex flex-col gap-4 w-full mb-6">
              <div className="flex items-center gap-4 bg-blue-50 rounded-xl p-4 shadow-sm">
                <span className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                <div>
                  <div className="font-bold text-blue-700 text-lg">Instant Tracking</div>
                  <div className="text-gray-700 text-sm">Real-time shipment status with interactive progress bars, detailed map views, and comprehensive timeline tracking for complete visibility.</div>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-red-50 rounded-xl p-4 shadow-sm">
                <span className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <div>
                  <div className="font-bold text-red-600 text-lg">LR & Invoice Management</div>
                  <div className="text-gray-700 text-sm">One-click access to download invoices and LR documents instantly. Streamlined billing with organized digital documentation.</div>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4 shadow-sm">
                <span className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 3h8"/></svg></span>
                <div>
                  <div className="font-bold text-green-700 text-lg">Customer Dashboard</div>
                  <div className="text-gray-700 text-sm">Comprehensive overview of all shipments in elegant cards and tables. Monitor multiple consignments at a single glance.</div>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-purple-50 rounded-xl p-4 shadow-sm">
                <span className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 3h8"/></svg></span>
                <div>
                  <div className="font-bold text-purple-700 text-lg">Mobile + Desktop Access</div>
                  <div className="text-gray-700 text-sm">Seamless experience across all devices. Access your dashboard from desktop, tablet, or mobile with synchronized data everywhere.</div>
                </div>
              </div>
            </div>
          </div>
          {/* Right: Dashboard image */}
          <div className="flex items-center justify-center relative">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 flex flex-col items-center justify-center">
              <div className="absolute top-6 right-6 bg-white rounded-full px-4 py-2 shadow text-green-600 font-semibold text-sm flex items-center gap-2">● Live Tracking</div>
              <img src="/dashboard.png" alt="Spice Express Dashboard" className="w-full h-80 object-cover rounded-2xl mb-2" />
              <div className="absolute bottom-6 left-6 bg-white rounded-full px-4 py-2 shadow text-gray-700 font-semibold text-sm flex items-center gap-2">🚚 2,847 Active</div>
            </div>
          </div>
        </section>
      </ScrollReveal>
      {/* Testimonials Section */}
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
      {/* Partners Section */}
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
                  <div key={i} className="w-40 h-24 bg-gray-200 rounded flex items-center justify-center">Logo {i+1}</div>
                ))}
                {/* Duplicate for seamless loop */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={`dup-${i}`} className="w-40 h-24 bg-gray-200 rounded flex items-center justify-center">Logo {i+1}</div>
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
        <section className="py-12 bg-[#212121] text-white text-center">
          <h3 className="text-2xl font-bold mb-2 text-white">Ready to Ship with Us?</h3>
          <p className="mb-4 text-white">Join thousands of satisfied customers who trust Spice Express for their logistics needs.</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-4">
            <a href="#" className="px-6 py-3 rounded bg-red-600 text-white font-semibold hover:bg-red-700">Get Instant Quote</a>
            <button
              className="px-6 py-3 rounded bg-white text-red-600 font-semibold hover:bg-red-50 border border-red-600"
              onClick={() => setTrackingOpen(true)}
            >
              Track Your Shipment
            </button>
          </div>
        </section>
      </ScrollReveal>
      {/* Modal - Moved outside of CTA and hero sections */}
      <Modal open={trackingOpen} onClose={() => setTrackingOpen(false)}>
        <Tracking />
      </Modal>
      {/* Footer */}
      <ScrollReveal y={30} scale={0.99}>
  <footer id="contact" className="bg-neutral-900 text-neutral-100 pt-10 pb-4 mt-0 scroll-mt-28">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
            {/* Company Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="Spice Express Logo" className="w-12 h-12 rounded" />
                <div>
                  <span className="font-bold text-xl text-white">Spice Express</span>
                  <div className="text-sm text-neutral-300">& Logistics Company</div>
                </div>
              </div>
              <div className="text-sm text-neutral-300 mb-2">India's premier rail-logistics solution since 2019. Revolutionizing cargo movement with the speed and reliability of India's rail network.</div>
              <div className="flex gap-3 mt-2 text-neutral-400">
                <a href="#" aria-label="Facebook"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.674V1.326C24 .6 23.4 0 22.675 0"/></svg></a>
                <a href="#" aria-label="Twitter"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 01-2.828.775 4.932 4.932 0 002.165-2.724c-.951.555-2.005.959-3.127 1.184A4.92 4.92 0 0016.616 3c-2.717 0-4.92 2.206-4.92 4.917 0 .386.044.762.127 1.124C7.691 8.84 4.066 6.884 1.64 3.94c-.423.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 01-2.229-.616c-.054 1.997 1.397 3.872 3.448 4.292a4.936 4.936 0 01-2.224.084c.627 1.956 2.444 3.377 4.6 3.418A9.867 9.867 0 010 21.543a13.94 13.94 0 007.548 2.212c9.058 0 14.009-7.513 14.009-14.009 0-.213-.005-.425-.014-.636A10.025 10.025 0 0024 4.557z"/></svg></a>
                <a href="#" aria-label="LinkedIn"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.601 2.001 3.601 4.601v5.595z"/></svg></a>
                <a href="#" aria-label="Instagram"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.974 1.246 2.242 1.308 3.608.058 1.266.069 1.646.069 4.85s-.011 3.584-.069 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.975-2.242 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.011-4.85-.069c-1.366-.062-2.633-.334-3.608-1.308-.975-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.981-.981 2.093-1.264 3.374-1.323C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.414 3.678 1.395c-.98.98-1.263 2.092-1.322 3.373C2.013 5.668 2 6.077 2 12c0 5.923.013 6.332.072 7.612.059 1.281.342 2.393 1.322 3.373.981.981 2.093 1.264 3.374 1.323C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.281-.059 2.393-.342 3.374-1.323.98-.98 1.263-2.092 1.322-3.373.059-1.28.072-1.689.072-7.612 0-5.923-.013-6.332-.072-7.612-.059-1.281-.342-2.393-1.322-3.373-.981-.981-2.093-1.264-3.374-1.323C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg></a>
              </div>
            </div>
            {/* Quick Links */}
            <div>
              <div className="font-bold mb-2">Quick Links</div>
              <ul className="text-sm space-y-1">
                <li><a href="#about" className="hover:underline">About Us</a></li>
                <li><a href="#services" className="hover:underline">Our Services</a></li>
                <li><a href="#track" className="hover:underline">Track Shipment</a></li>
                <li><a href="#quote" className="hover:underline">Get Quote</a></li>
                <li><a href="#portal" className="hover:underline">Customer Portal</a></li>
              </ul>
            </div>
            {/* Contact Info */}
            <div>
              <div className="font-bold mb-2">Contact</div>
              <div className="flex flex-col gap-1 text-sm text-neutral-300">
                  <div className="flex items-start gap-2"><svg className="w-4 h-4 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6c0 4.418-6 10-6 10S4 12.418 4 8a6 6 0 016-6zm0 8a2 2 0 100-4 2 2 0 000 4z"/></svg> D-42, Martin Nagar, Nara Road<br/>Jaripatka, Nagpur-440014</div>
                <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3.5A1.5 1.5 0 013.5 2h13A1.5 1.5 0 0118 3.5v13A1.5 1.5 0 0116.5 18h-13A1.5 1.5 0 012 16.5v-13zM4 4v12h12V4H4zm2 2h8v8H6V6z"/></svg> 7773952909<br/>9921065387</div>
                <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2.94 6.94a1.5 1.5 0 012.12 0l7.07 7.07a1.5 1.5 0 01-2.12 2.12l-7.07-7.07a1.5 1.5 0 010-2.12z"/></svg> julie.douglas@spiceexpress.co.in</div>
                <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/></svg> www.spiceexpress.in</div>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-neutral-800 pt-4 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-400 px-6">
            <span>© 2024 Spice Express & Logistics Company. All rights reserved.</span>
            <div className="flex gap-4 mt-2 md:mt-0">
              <a href="#" className="hover:underline">Privacy Policy</a>
              <a href="#" className="hover:underline">Terms of Service</a>
              <a href="#" className="hover:underline">Cookie Policy</a>
            </div>
          </div>
        </footer>
      </ScrollReveal>

    </div>
  );
};

export default LandingPage;
