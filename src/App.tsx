/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Camera, Droplets, Instagram, Mail, Phone, Send, User, ShoppingCart, ArrowLeft, Plus, Minus, Trash2, CheckCircle2, CreditCard, LayoutDashboard, LogOut, Settings, Package, MessageSquare, Image as ImageIcon, Eye, X, Save, Play, Clock, Lock } from 'lucide-react';
import { FormEvent, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePaystackPayment } from 'react-paystack';

interface Perfume {
  id: number;
  name: string;
  price: string;
  priceValue: number;
  image: string;
  inStock: number;
}

interface CartItem extends Perfume {
  quantity: number;
}

type View = 'home' | 'cart' | 'checkout-success' | 'portfolio-detail' | 'checkout-form' | 'admin-login' | 'admin-dashboard';

interface PortfolioWork {
  id: number;
  portfolio_id: number;
  title: string;
  image: string;
  type: 'video' | 'photo';
}

interface PortfolioItem {
  id: number;
  title: string;
  image: string;
  description: string;
  works: PortfolioWork[];
}

interface Message {
  id: number;
  name: string;
  email: string;
  service: string;
  message: string;
  createdAt: string;
}

interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: string;
  status: string;
  createdAt: string;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [selectedService, setSelectedService] = useState<PortfolioItem | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminData, setAdminData] = useState<{ messages: Message[], orders: Order[] }>({ messages: [], orders: [] });
  const [adminTab, setAdminTab] = useState<'orders' | 'messages' | 'perfumes' | 'portfolio'>('orders');
  const [editingPerfume, setEditingPerfume] = useState<Partial<Perfume> | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<Partial<PortfolioItem> | null>(null);

  // Data State
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [perfResponse, portResponse] = await Promise.all([
        fetch('/api/perfumes'),
        fetch('/api/portfolio')
      ]);
      
      if (!perfResponse.ok || !portResponse.ok) {
        throw new Error(`Server responded with ${perfResponse.status} or ${portResponse.status}`);
      }

      const perfData = await perfResponse.json();
      const portData = await portResponse.json();
      setPerfumes(perfData);
      setPortfolio(portData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin/data');
      const data = await response.json();
      setAdminData(data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const handlePortfolioClick = (item: PortfolioItem) => {
    setSelectedService(item);
    setView('portfolio-detail');
  };

  const addToCart = (perfume: Perfume) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === perfume.id);
      if (existing) {
        return prev.map(item => item.id === perfume.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...perfume, quantity: 1 }];
    });
    setView('cart');
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.priceValue * item.quantity), 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: customerEmail,
    amount: cartTotal * 100, // Paystack amount is in kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const onSuccess = async () => {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          totalAmount: cartTotal,
          items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
        })
      });
      setCart([]);
      setView('checkout-success');
      setFormStatus('idle');
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const onClose = () => {
    setFormStatus('idle');
  };

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');
    initializePayment({ onSuccess, onClose });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      service: formData.get('service'),
      message: formData.get('message'),
    };

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setFormStatus('success');
    } catch (error) {
      console.error("Error sending message:", error);
      setFormStatus('idle');
    }
  };

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.success) {
        setIsAdmin(true);
        setView('admin-dashboard');
        fetchAdminData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check the console for details.");
    }
  };

  const handleUpdatePerfume = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPerfume) return;
    
    const method = editingPerfume.id ? 'PUT' : 'POST';
    const url = editingPerfume.id ? `/api/admin/perfumes/${editingPerfume.id}` : '/api/admin/perfumes';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPerfume)
      });
      setEditingPerfume(null);
      fetchData();
    } catch (error) {
      console.error("Error updating perfume:", error);
    }
  };

  const handleUpdatePortfolio = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPortfolio) return;
    
    const method = editingPortfolio.id ? 'PUT' : 'POST';
    const url = editingPortfolio.id ? `/api/admin/portfolio/${editingPortfolio.id}` : '/api/admin/portfolio';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPortfolio)
      });
      setEditingPortfolio(null);
      fetchData();
    } catch (error) {
      console.error("Error updating portfolio:", error);
    }
  };

  const handleDeletePerfume = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/admin/perfumes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting perfume:", error);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-cream text-luxury-black font-sans selection:bg-gold/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gold/20 py-6 px-6 shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vibrant-emerald via-vibrant-gold to-vibrant-burgundy"></div>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="cursor-pointer group" onClick={() => setView('home')}>
            <h1 className="text-2xl md:text-3xl font-display font-medium tracking-widest uppercase text-vibrant-emerald transition-all group-hover:text-vibrant-orange">
              Divinegrace
              <span className="block text-[10px] tracking-[0.4em] font-sans font-light mt-1 text-vibrant-gold">Perfumes & Cinema</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setView('cart')}
            className="relative p-2 text-vibrant-emerald hover:text-vibrant-orange transition-all duration-300 bg-vibrant-emerald/5 rounded-full"
          >
            <ShoppingCart size={20} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-vibrant-orange text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.main 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-4 py-12"
          >
            <div className="text-center mb-24 mt-12 relative py-20 overflow-hidden rounded-3xl">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-vibrant-emerald/10 via-vibrant-gold/10 to-vibrant-burgundy/10 blur-3xl opacity-70"></div>
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-royal-blue/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amethyst/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              
              <motion.h2 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-6xl md:text-8xl font-display italic font-light mb-6 text-vibrant-emerald drop-shadow-sm"
              >
                The Art of <span className="text-vibrant-gold">Scent</span> & <span className="text-vibrant-burgundy">Story</span>
              </motion.h2>
              <p className="text-luxury-black/70 text-lg font-light tracking-[0.2em] max-w-2xl mx-auto uppercase text-sm bg-white/30 backdrop-blur-sm py-2 px-6 rounded-full inline-block border border-white/50">
                Curated fragrances and cinematic narratives by Divinegrace
              </p>
              <div className="w-48 h-[2px] bg-gradient-to-r from-transparent via-vibrant-gold to-transparent mx-auto mt-12"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
              {/* Perfumes Section */}
              <section>
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-[2px] bg-gradient-to-r from-vibrant-emerald to-transparent"></div>
                  <h3 className="text-2xl font-display tracking-widest uppercase text-vibrant-emerald font-bold">The Fragrance Collection</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  {perfumes.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ y: -12, scale: 1.02 }}
                      onClick={() => item.inStock ? addToCart(item) : null}
                      className={`group relative bg-white border border-vibrant-emerald/10 p-5 transition-all duration-700 cursor-pointer hover:shadow-2xl hover:shadow-vibrant-emerald/20 rounded-2xl ${!item.inStock && 'opacity-60'}`}
                    >
                      <div className="aspect-[4/5] bg-gradient-to-tr from-soft-rose to-vibrant-gold/5 relative overflow-hidden mb-6 rounded-xl">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                          referrerPolicy="no-referrer"
                        />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-vibrant-burgundy/30 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-white border-2 border-white/60 px-4 py-2 bg-vibrant-burgundy/80 rounded-full">Out of Stock</span>
                          </div>
                        )}
                        {item.inStock && (
                          <div className="absolute inset-0 bg-gradient-to-t from-vibrant-emerald/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        )}
                      </div>
                      <div className="text-center">
                        <h4 className="font-display text-xl mb-1 group-hover:text-vibrant-emerald transition-colors duration-300 font-medium">{item.name}</h4>
                        <p className="text-vibrant-orange font-bold tracking-widest text-sm mb-4">{item.price}</p>
                        <div className="w-full py-4 text-[10px] tracking-[0.4em] uppercase transition-all duration-500 border-2 border-vibrant-emerald/20 group-hover:border-vibrant-emerald group-hover:bg-vibrant-emerald group-hover:text-white rounded-full font-bold">
                          {item.inStock ? 'Add to Collection' : 'Unavailable'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Cinematography Section */}
              <section>
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-[2px] bg-gradient-to-r from-vibrant-burgundy to-transparent"></div>
                  <h3 className="text-2xl font-display tracking-widest uppercase text-vibrant-burgundy font-bold">Cinematic Narratives</h3>
                </div>
                <div className="grid grid-cols-1 gap-12">
                  {portfolio.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ x: 15 }}
                      onClick={() => handlePortfolioClick(item)}
                      className="group relative cursor-pointer border-b border-vibrant-burgundy/20 pb-12"
                    >
                      <div className="aspect-video bg-vibrant-burgundy overflow-hidden mb-6 relative rounded-2xl shadow-xl">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1.5s] grayscale group-hover:grayscale-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-royal-blue/40 via-transparent to-vibrant-burgundy/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full border-2 border-white/50 flex items-center justify-center bg-white/20 backdrop-blur-md shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
                             <Play size={40} fill="white" className="text-white ml-2" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-3xl font-display italic mb-2 group-hover:text-vibrant-burgundy transition-colors duration-300 font-medium">{item.title}</h4>
                          <p className="text-luxury-black/50 text-[10px] tracking-[0.3em] uppercase font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-vibrant-burgundy rounded-full animate-pulse"></span>
                            View Cinematic Work — 2025
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-full border-2 border-vibrant-burgundy/20 flex items-center justify-center group-hover:border-vibrant-burgundy group-hover:text-vibrant-burgundy group-hover:bg-vibrant-burgundy/5 transition-all duration-500">
                          <Play size={16} fill="currentColor" className="ml-1" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>

            {/* Contact Form Section */}
            <section id="contact-section" className="mt-48 max-w-4xl mx-auto mb-24 relative">
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-vibrant-emerald/10 rounded-full blur-[100px] -z-10 animate-pulse"></div>
              <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-vibrant-burgundy/10 rounded-full blur-[100px] -z-10 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-royal-blue/5 rounded-full blur-[120px] -z-10"></div>
              
              <div className="text-center mb-20">
                <h2 className="text-5xl font-display italic mb-4 text-vibrant-emerald">Inquiries & Bookings</h2>
                <div className="w-48 h-[2px] bg-gradient-to-r from-transparent via-vibrant-emerald to-transparent mx-auto mb-6"></div>
                <p className="text-luxury-black/60 font-bold tracking-[0.3em] uppercase text-xs">Let's create something timeless together</p>
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white p-8 md:p-20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-emerald via-vibrant-gold to-vibrant-burgundy"></div>
                {formStatus === 'success' ? (
                  <div className="py-20 text-center">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-24 h-24 border border-gold text-gold rounded-full flex items-center justify-center mx-auto mb-8"
                    >
                      <Send size={32} strokeWidth={1} />
                    </motion.div>
                    <h3 className="text-3xl font-display italic mb-4">Message Received</h3>
                    <p className="text-luxury-black/50 font-light mb-12">Divinegrace will be in touch with you shortly.</p>
                    <button 
                      onClick={() => setFormStatus('idle')}
                      className="text-gold tracking-[0.2em] uppercase text-[10px] font-medium hover:text-luxury-black transition-colors"
                    >
                      Send another inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Full Name</label>
                        <input 
                          required
                          name="name"
                          type="text" 
                          placeholder="Your Name"
                          className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light placeholder:text-luxury-black/20"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Email Address</label>
                        <input 
                          required
                          name="email"
                          type="email" 
                          placeholder="your@email.com"
                          className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light placeholder:text-luxury-black/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Service of Interest</label>
                      <select name="service" className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light bg-white cursor-pointer">
                        <option>Perfumes</option>
                        <option>Cinematography</option>
                        <option>Both</option>
                        <option>Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Your Message</label>
                      <textarea 
                        required
                        name="message"
                        rows={4}
                        placeholder="Tell us about your vision..."
                        className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light resize-none placeholder:text-luxury-black/20"
                      ></textarea>
                    </div>

                    <button 
                      disabled={formStatus === 'submitting'}
                      type="submit"
                      className="w-full bg-luxury-black text-white py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500 shadow-xl shadow-luxury-black/10 flex items-center justify-center gap-2"
                    >
                      {formStatus === 'submitting' ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </motion.main>
        )}

        {view === 'portfolio-detail' && selectedService && (
          <motion.main 
            key="portfolio-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-7xl mx-auto px-6 py-24"
          >
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-vibrant-emerald hover:text-vibrant-orange mb-16 transition-all text-[10px] tracking-[0.3em] uppercase font-black bg-white/50 py-3 px-6 rounded-full border border-vibrant-emerald/10"
            >
              <ArrowLeft size={16} />
              Return to Gallery
            </button>

            <div className="mb-24 relative">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-amethyst/10 rounded-full blur-3xl -z-10"></div>
              <h2 className="text-6xl md:text-8xl font-display italic mb-8 text-vibrant-emerald">{selectedService.title}</h2>
              <div className="w-24 h-[3px] bg-gradient-to-r from-vibrant-emerald to-vibrant-gold mb-8"></div>
              <p className="text-luxury-black/70 text-xl font-light max-w-3xl leading-relaxed italic">"{selectedService.description}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {selectedService.works.map((work) => (
                <div key={work.id} className="group relative">
                  <div className="aspect-video relative overflow-hidden bg-luxury-black mb-8 rounded-3xl shadow-2xl">
                    <img 
                      src={work.image} 
                      alt={work.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] grayscale group-hover:grayscale-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-6 right-6">
                      <span className="bg-vibrant-gold text-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                        {work.type}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-vibrant-emerald/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-display italic mb-2 text-vibrant-emerald group-hover:text-vibrant-orange transition-colors">{work.title}</h3>
                    <p className="text-luxury-black/50 text-[10px] tracking-[0.3em] uppercase font-black flex items-center gap-2">
                      <span className="w-2 h-2 bg-vibrant-gold rounded-full"></span>
                      Cinematography by Divinegrace
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-32 bg-gradient-to-br from-vibrant-emerald via-emerald to-royal-blue p-12 md:p-24 text-center text-white rounded-[3rem] relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-5xl md:text-7xl font-display italic mb-8">Capture Your Moment</h3>
                <p className="text-white/80 mb-12 max-w-xl mx-auto font-light leading-relaxed text-lg">Let's translate your vision into a cinematic masterpiece. Contact us today to discuss your project.</p>
                <button 
                  onClick={() => {
                    setView('home');
                    setTimeout(() => {
                      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="bg-vibrant-gold text-emerald px-16 py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:bg-white hover:text-emerald transition-all duration-500 rounded-full shadow-2xl"
                >
                  Request a Consultation
                </button>
              </div>
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-vibrant-gold"></div>
              </div>
            </div>
          </motion.main>
        )}

        {view === 'cart' && (
          <motion.main 
            key="cart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto px-6 py-24"
          >
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-vibrant-emerald hover:text-vibrant-orange mb-16 transition-all text-[10px] tracking-[0.3em] uppercase font-black bg-white/50 py-3 px-6 rounded-full border border-vibrant-emerald/10"
            >
              <ArrowLeft size={16} />
              Continue Selection
            </button>

            <h2 className="text-5xl font-display italic mb-12 text-vibrant-emerald">Your Selection</h2>

            {cart.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-xl border border-white p-20 text-center shadow-2xl rounded-[2rem]">
                <div className="w-24 h-24 bg-vibrant-emerald/5 text-vibrant-emerald rounded-full flex items-center justify-center mx-auto mb-8 border border-vibrant-emerald/10">
                  <ShoppingCart size={40} strokeWidth={1} />
                </div>
                <p className="text-luxury-black/60 font-light text-xl mb-12 italic">Your collection is currently empty</p>
                <button 
                  onClick={() => setView('home')}
                  className="bg-vibrant-emerald text-white px-16 py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:bg-vibrant-orange transition-all duration-500 rounded-full shadow-xl"
                >
                  Explore Fragrances
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-[2rem] overflow-hidden">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-8 p-10 border-b border-vibrant-emerald/5 last:border-0 hover:bg-vibrant-emerald/5 transition-colors group">
                      <div className="w-32 h-32 bg-soft-rose rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-2xl italic mb-1 text-vibrant-emerald">{item.name}</h3>
                        <p className="text-vibrant-orange font-black tracking-widest text-sm">{item.price}</p>
                      </div>
                      <div className="flex items-center gap-6 border-2 border-vibrant-emerald/10 px-6 py-3 rounded-full bg-white">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="text-vibrant-emerald hover:text-vibrant-orange transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-black text-lg text-vibrant-emerald">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="text-vibrant-emerald hover:text-vibrant-orange transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-vibrant-burgundy/30 hover:text-vibrant-orange transition-colors p-3 hover:bg-vibrant-orange/5 rounded-full"
                      >
                        <Trash2 size={22} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-white p-12 shadow-2xl rounded-[2rem]">
                  <div className="flex justify-between items-center mb-12">
                    <span className="text-luxury-black/50 tracking-[0.3em] uppercase text-[10px] font-black">Total Investment</span>
                    <span className="text-4xl font-display italic text-vibrant-emerald">
                      ₦{cartTotal.toLocaleString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setView('checkout-form')}
                    className="w-full bg-gradient-to-r from-vibrant-emerald to-royal-blue text-white py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:shadow-2xl hover:shadow-vibrant-emerald/40 transition-all duration-500 rounded-full"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </motion.main>
        )}

        {view === 'checkout-form' && (
          <motion.main 
            key="checkout-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto px-6 py-24"
          >
            <button 
              onClick={() => setView('cart')}
              className="flex items-center gap-2 text-vibrant-emerald hover:text-vibrant-orange mb-16 transition-all text-[10px] tracking-[0.3em] uppercase font-black bg-white/50 py-3 px-6 rounded-full border border-vibrant-emerald/10"
            >
              <ArrowLeft size={16} />
              Return to Selection
            </button>

            <div className="bg-white/80 backdrop-blur-xl border border-white p-8 md:p-20 shadow-2xl rounded-[3rem] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-emerald via-vibrant-gold to-vibrant-orange"></div>
              <h2 className="text-4xl font-display italic mb-12 flex items-center gap-4 text-vibrant-emerald">
                <CreditCard className="text-vibrant-gold" strokeWidth={1.5} />
                Checkout
              </h2>
              <form onSubmit={handleCheckout} className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-emerald/60">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-transparent border-b-2 border-vibrant-emerald/10 py-5 focus:border-vibrant-gold outline-none transition-all font-light placeholder:text-luxury-black/20 text-xl"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-emerald/60">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-transparent border-b-2 border-vibrant-emerald/10 py-5 focus:border-vibrant-gold outline-none transition-all font-light placeholder:text-luxury-black/20 text-xl"
                  />
                </div>
                <div className="pt-12 border-t border-vibrant-emerald/10">
                  <div className="flex justify-between items-center mb-12">
                    <span className="text-luxury-black/50 tracking-[0.3em] uppercase text-[10px] font-black">Final Investment</span>
                    <span className="text-3xl font-display italic text-vibrant-emerald">₦{cartTotal.toLocaleString()}</span>
                  </div>
                  <button 
                    disabled={formStatus === 'submitting'}
                    type="submit"
                    className="w-full bg-vibrant-emerald text-white py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:bg-vibrant-orange transition-all duration-500 rounded-full shadow-xl shadow-vibrant-emerald/20 flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    {formStatus === 'submitting' ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock size={14} />
                        Secure Payment with Paystack
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.main>
        )}

        {view === 'checkout-success' && (
          <motion.main 
            key="success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto px-6 py-32 text-center"
          >
            <div className="w-32 h-32 bg-vibrant-emerald/10 text-vibrant-emerald rounded-full flex items-center justify-center mx-auto mb-12 border-4 border-vibrant-emerald shadow-2xl shadow-vibrant-emerald/20 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-5xl font-display italic mb-6 text-vibrant-emerald">Selection Confirmed</h2>
            <p className="text-luxury-black/60 font-light text-xl mb-16 leading-relaxed italic">
              Thank you for your investment. Divinegrace will contact you shortly to arrange the delivery of your curated fragrances.
            </p>
            <button 
              onClick={() => setView('home')}
              className="bg-gradient-to-r from-vibrant-emerald to-royal-blue text-white px-16 py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:shadow-2xl hover:shadow-vibrant-emerald/40 transition-all duration-500 rounded-full"
            >
              Return to Gallery
            </button>
          </motion.main>
        )}

        {view === 'admin-login' && (
          <motion.main 
            key="admin-login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto px-6 py-32"
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] relative overflow-hidden rounded-[2.5rem]">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-emerald via-vibrant-gold to-vibrant-orange"></div>
              <div className="text-center mb-12">
                <div className="w-20 h-20 border-2 border-vibrant-emerald/20 text-vibrant-emerald rounded-3xl flex items-center justify-center mx-auto mb-6 bg-vibrant-emerald/5 rotate-12 group-hover:rotate-0 transition-transform">
                  <LayoutDashboard size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-display italic text-vibrant-emerald">Administrative Access</h2>
                <p className="text-vibrant-gold text-[10px] tracking-[0.3em] uppercase font-black mt-2">Divinegrace Portal</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-emerald/60">Username</label>
                  <input 
                    required
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-vibrant-emerald/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-emerald/60">Password</label>
                  <input 
                    required
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-vibrant-emerald/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-lg"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-vibrant-emerald text-white py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:bg-vibrant-orange transition-all duration-500 shadow-2xl shadow-vibrant-emerald/30 rounded-2xl"
                >
                  Enter Dashboard
                </button>
              </form>
            </div>
          </motion.main>
        )}

        {view === 'admin-dashboard' && isAdmin && (
          <motion.main 
            key="admin-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto px-6 py-12"
          >
            <div className="flex justify-between items-end mb-16 pb-8 border-b border-vibrant-emerald/20">
              <div>
                <h2 className="text-4xl font-display italic mb-2 text-vibrant-emerald">Management Console</h2>
                <p className="text-vibrant-gold text-[10px] tracking-[0.3em] uppercase font-black">Divinegrace Administrative Access</p>
              </div>
              <button 
                onClick={() => { setIsAdmin(false); setView('home'); }}
                className="flex items-center gap-2 text-vibrant-burgundy hover:text-vibrant-orange transition-all text-[10px] tracking-[0.2em] uppercase font-bold bg-vibrant-burgundy/5 py-3 px-6 rounded-full border border-vibrant-burgundy/20"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>

            <div className="flex gap-8 mb-16 overflow-x-auto pb-4 no-scrollbar">
              {[
                { id: 'orders', label: 'Orders', icon: Package, color: 'text-vibrant-emerald' },
                { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-royal-blue' },
                { id: 'perfumes', label: 'Perfumes', icon: Droplets, color: 'text-vibrant-orange' },
                { id: 'portfolio', label: 'Portfolio', icon: ImageIcon, color: 'text-amethyst' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as any)}
                  className={`flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase font-black transition-all px-6 py-3 rounded-xl border ${adminTab === tab.id ? `bg-white shadow-xl border-gold ${tab.color}` : 'text-luxury-black/30 border-transparent hover:bg-white/50'}`}
                >
                  <tab.icon size={16} strokeWidth={2} />
                  {tab.label}
                  {adminTab === tab.id && <motion.div layoutId="activeTab" className="w-2 h-2 bg-gold rounded-full ml-1 animate-pulse" />}
                </button>
              ))}
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden rounded-3xl">
              {adminTab === 'orders' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-vibrant-emerald/5 border-b border-vibrant-emerald/10">
                      <tr>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-black text-vibrant-emerald">Customer</th>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-black text-vibrant-emerald">Investment</th>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-black text-vibrant-emerald">Collection</th>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-black text-vibrant-emerald">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vibrant-emerald/5">
                      {adminData.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-vibrant-emerald/5 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-display text-xl italic text-vibrant-emerald group-hover:text-vibrant-orange transition-colors">{order.customerName}</div>
                            <div className="text-[10px] text-luxury-black/40 font-bold tracking-wider">{order.customerEmail}</div>
                          </td>
                          <td className="px-8 py-6 font-display text-2xl text-vibrant-gold italic">₦{order.totalAmount.toLocaleString()}</td>
                          <td className="px-8 py-6 text-xs font-medium">
                            {JSON.parse(order.items).map((i: any, idx: number) => (
                              <div key={idx} className="mb-1 text-luxury-black/70 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-vibrant-emerald rounded-full"></span>
                                {i.name} <span className="text-vibrant-emerald font-black ml-1">x{i.quantity}</span>
                              </div>
                            ))}
                          </td>
                          <td className="px-8 py-6 text-[10px] tracking-[0.1em] text-luxury-black/30 font-black">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'messages' && (
                <div className="divide-y divide-royal-blue/10">
                  {adminData.messages.map((msg) => (
                    <div key={msg.id} className="p-12 hover:bg-royal-blue/5 transition-colors relative group">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-1/2 bg-royal-blue transition-all duration-500 rounded-r-full"></div>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="font-display text-3xl italic mb-2 text-royal-blue">{msg.name}</h3>
                          <p className="text-vibrant-gold text-[10px] tracking-[0.3em] uppercase font-black">{msg.email}</p>
                        </div>
                        <span className="text-[9px] tracking-[0.3em] uppercase px-4 py-2 border-2 border-royal-blue/20 text-royal-blue font-black bg-royal-blue/5 rounded-full">
                          {msg.service}
                        </span>
                      </div>
                      <p className="text-luxury-black/70 font-light leading-relaxed italic text-xl bg-white/50 p-6 rounded-2xl border border-white">"{msg.message}"</p>
                      <p className="text-[10px] tracking-[0.2em] text-luxury-black/30 mt-8 font-black flex items-center gap-2">
                        <Clock size={12} />
                        {new Date(msg.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {adminTab === 'perfumes' && (
                <div className="p-12">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-3xl font-display italic text-vibrant-orange">Fragrance Inventory</h3>
                    <button 
                      onClick={() => setEditingPerfume({ name: '', price: '₦0', priceValue: 0, image: '', inStock: 1 })}
                      className="bg-gradient-to-r from-vibrant-orange to-vibrant-gold text-white px-10 py-4 text-[10px] tracking-[0.3em] uppercase font-black hover:shadow-2xl hover:shadow-vibrant-orange/40 transition-all rounded-full"
                    >
                      Add New Scent
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {perfumes.map((p) => (
                      <div key={p.id} className="bg-white border border-vibrant-orange/10 p-8 group rounded-3xl hover:shadow-2xl transition-all duration-500">
                        <div className="relative overflow-hidden rounded-2xl mb-8 border border-vibrant-orange/5">
                          <img src={p.image} className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-vibrant-orange/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="font-display text-2xl italic text-vibrant-orange mb-1">{p.name}</h4>
                            <p className="text-vibrant-gold text-sm font-black tracking-widest">{p.price}</p>
                          </div>
                          <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 font-black rounded-full ${p.inStock ? 'border-vibrant-emerald text-vibrant-emerald bg-vibrant-emerald/5' : 'border-vibrant-burgundy text-vibrant-burgundy bg-vibrant-burgundy/5'}`}>
                            {p.inStock ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setEditingPerfume(p)}
                            className="flex-1 border-2 border-vibrant-orange/20 py-4 text-[10px] tracking-[0.3em] uppercase font-black hover:bg-vibrant-orange hover:text-white transition-all rounded-xl text-vibrant-orange"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePerfume(p.id)}
                            className="px-6 border-2 border-vibrant-burgundy/20 text-vibrant-burgundy/60 hover:text-white hover:bg-vibrant-burgundy transition-all rounded-xl"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'portfolio' && (
                <div className="p-12">
                  <h3 className="text-3xl font-display italic mb-12 text-amethyst">Cinematic Portfolio</h3>
                  <div className="grid grid-cols-1 gap-12">
                    {portfolio.map((p) => (
                      <div key={p.id} className="flex flex-col md:flex-row gap-12 items-center border-b border-amethyst/10 pb-12 group">
                        <div className="relative overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
                          <img src={p.image} className="w-full md:w-80 aspect-video object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-amethyst/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-3xl font-display italic mb-4 text-amethyst">{p.title}</h4>
                          <p className="text-luxury-black/60 text-lg font-light mb-8 leading-relaxed bg-amethyst/5 p-6 rounded-2xl border border-amethyst/10 italic">"{p.description}"</p>
                          <button 
                            onClick={() => setEditingPortfolio(p)}
                            className="bg-amethyst text-white px-10 py-4 text-[10px] tracking-[0.3em] uppercase font-black hover:bg-vibrant-gold transition-all rounded-full shadow-lg shadow-amethyst/20"
                          >
                            Edit Narrative
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Edit Modals */}
            <AnimatePresence>
              {editingPerfume && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-luxury-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }}
                    className="bg-white/95 border border-white w-full max-w-lg overflow-hidden shadow-[0_64px_128px_-24px_rgba(0,0,0,0.5)] rounded-[3rem] relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-orange via-vibrant-gold to-vibrant-emerald"></div>
                    <div className="p-10 border-b border-vibrant-orange/10 flex justify-between items-center bg-vibrant-orange/5">
                      <h3 className="text-3xl font-display italic text-vibrant-orange">{editingPerfume.id ? 'Edit Fragrance' : 'New Fragrance'}</h3>
                      <button onClick={() => setEditingPerfume(null)} className="text-vibrant-orange/40 hover:text-vibrant-orange transition-colors p-2 hover:bg-vibrant-orange/10 rounded-full"><X size={24} /></button>
                    </div>
                    <form onSubmit={handleUpdatePerfume} className="p-10 space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-orange/60">Fragrance Name</label>
                        <input 
                          required value={editingPerfume.name} 
                          onChange={e => setEditingPerfume({...editingPerfume, name: e.target.value})}
                          className="w-full bg-transparent border-b-2 border-vibrant-orange/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-orange/60">Display Price</label>
                          <input 
                            required value={editingPerfume.price} 
                            onChange={e => setEditingPerfume({...editingPerfume, price: e.target.value})}
                            className="w-full bg-transparent border-b-2 border-vibrant-orange/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-orange/60">Numeric Value</label>
                          <input 
                            required type="number" value={editingPerfume.priceValue} 
                            onChange={e => setEditingPerfume({...editingPerfume, priceValue: parseInt(e.target.value)})}
                            className="w-full bg-transparent border-b-2 border-vibrant-orange/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.3em] uppercase font-black text-vibrant-orange/60">Image URL</label>
                        <input 
                          required value={editingPerfume.image} 
                          onChange={e => setEditingPerfume({...editingPerfume, image: e.target.value})}
                          className="w-full bg-transparent border-b-2 border-vibrant-orange/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl"
                        />
                      </div>
                      <div className="flex items-center gap-4 bg-vibrant-emerald/5 p-4 rounded-2xl border border-vibrant-emerald/10">
                        <input 
                          type="checkbox" checked={!!editingPerfume.inStock} 
                          onChange={e => setEditingPerfume({...editingPerfume, inStock: e.target.checked ? 1 : 0})}
                          id="inStockCheck"
                          className="w-6 h-6 accent-vibrant-emerald"
                        />
                        <label htmlFor="inStockCheck" className="text-[10px] tracking-[0.2em] uppercase font-black text-vibrant-emerald">Available in Collection</label>
                      </div>
                      <button type="submit" className="w-full bg-vibrant-orange text-white py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:bg-vibrant-gold transition-all duration-500 rounded-2xl shadow-2xl shadow-vibrant-orange/30">
                        Save Fragrance Details
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}

              {editingPortfolio && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-luxury-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }}
                    className="bg-white/95 border border-white w-full max-w-lg overflow-hidden shadow-[0_64px_128px_-24px_rgba(0,0,0,0.5)] rounded-[3rem] relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amethyst via-vibrant-gold to-royal-blue"></div>
                    <div className="p-10 border-b border-amethyst/10 flex justify-between items-center bg-amethyst/5">
                      <h3 className="text-3xl font-display italic text-amethyst">{editingPortfolio.id ? 'Edit Narrative' : 'New Narrative'}</h3>
                      <button onClick={() => setEditingPortfolio(null)} className="text-amethyst/40 hover:text-amethyst transition-colors p-2 hover:bg-amethyst/10 rounded-full"><X size={24} /></button>
                    </div>
                    <form onSubmit={handleUpdatePortfolio} className="p-10 space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.3em] uppercase font-black text-amethyst/60">Narrative Title</label>
                        <input 
                          required value={editingPortfolio.title} 
                          onChange={e => setEditingPortfolio({...editingPortfolio, title: e.target.value})}
                          className="w-full bg-transparent border-b-2 border-amethyst/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.3em] uppercase font-black text-amethyst/60">Description</label>
                        <textarea 
                          required value={editingPortfolio.description} 
                          onChange={e => setEditingPortfolio({...editingPortfolio, description: e.target.value})}
                          rows={4}
                          className="w-full bg-transparent border-b-2 border-amethyst/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] tracking-[0.3em] uppercase font-black text-amethyst/60">Thumbnail URL</label>
                        <input 
                          required value={editingPortfolio.image} 
                          onChange={e => setEditingPortfolio({...editingPortfolio, image: e.target.value})}
                          className="w-full bg-transparent border-b-2 border-amethyst/10 py-4 focus:border-vibrant-gold outline-none transition-all font-light text-xl"
                        />
                      </div>
                      <button type="submit" className="w-full bg-amethyst text-white py-6 text-[10px] tracking-[0.4em] uppercase font-black hover:bg-vibrant-gold transition-all duration-500 rounded-2xl shadow-2xl shadow-amethyst/30">
                        Save Narrative Details
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-vibrant-burgundy text-white py-24 px-6 mt-48 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-emerald via-vibrant-gold to-vibrant-orange"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-vibrant-gold/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-royal-blue/20 rounded-full blur-[100px]"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-24 relative z-10">
          <div>
            <h3 className="text-3xl font-display font-medium tracking-widest uppercase mb-8 text-vibrant-gold">Divinegrace</h3>
            <p className="text-white/80 font-light leading-relaxed text-lg">Premium perfumes and cinematic storytelling by Divinegrace. Based in Benin City, Nigeria.</p>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-black mb-8 text-vibrant-gold/70">Contact</h4>
            <div className="space-y-6 text-white font-light text-lg">
              <a href="tel:+2348138329374" className="flex items-center gap-4 hover:text-vibrant-gold transition-all hover:translate-x-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Phone size={18} strokeWidth={1.5} /></div>
                +234 813 832 9374
              </a>
              <a href="mailto:osmosistrade7@gmail.com" className="flex items-center gap-4 hover:text-vibrant-gold transition-all hover:translate-x-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Mail size={18} strokeWidth={1.5} /></div>
                osmosistrade7@gmail.com
              </a>
              <a href="https://instagram.com" className="flex items-center gap-4 hover:text-vibrant-gold transition-all hover:translate-x-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Instagram size={18} strokeWidth={1.5} /></div>
                @divinegrace_perfumes
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.4em] uppercase font-black mb-8 text-vibrant-gold/70">Administrative</h4>
            <button 
              onClick={() => setView('admin-login')}
              className="group text-white/80 hover:text-vibrant-gold flex items-center gap-4 text-[10px] tracking-[0.3em] uppercase font-bold transition-all bg-white/5 py-4 px-6 rounded-xl border border-white/10 hover:border-vibrant-gold/50"
            >
              <div className="w-8 h-8 rounded-lg bg-vibrant-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform"><LayoutDashboard size={16} strokeWidth={1.5} /></div>
              Access Dashboard
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-12 border-t border-white/10 text-center text-white/50 text-[10px] tracking-[0.4em] uppercase font-bold">
          © 2025 Divinegrace perfumes. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
