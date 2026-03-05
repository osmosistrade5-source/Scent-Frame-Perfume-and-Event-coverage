/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Camera, Droplets, Instagram, Mail, Phone, Send, User, ShoppingCart, ArrowLeft, Plus, Minus, Trash2, CheckCircle2, CreditCard, LayoutDashboard, LogOut, Settings, Package, MessageSquare, Image as ImageIcon, Eye, X, Save, Play } from 'lucide-react';
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
      <header className="sticky top-0 z-50 bg-luxury-cream/80 backdrop-blur-md border-b border-luxury-black/5 py-6 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="cursor-pointer group" onClick={() => setView('home')}>
            <h1 className="text-2xl md:text-3xl font-display font-medium tracking-widest uppercase text-luxury-black transition-colors group-hover:text-gold">
              Divinegrace
              <span className="block text-[10px] tracking-[0.4em] font-sans font-light mt-1 opacity-60">Perfumes & Cinema</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setView('cart')}
            className="relative p-2 text-luxury-black hover:text-gold transition-all duration-300"
          >
            <ShoppingCart size={20} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-white text-[9px] font-medium w-4 h-4 flex items-center justify-center rounded-full">
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
            <div className="text-center mb-24 mt-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-display italic font-light mb-6"
              >
                The Art of Scent & Story
              </motion.h2>
              <p className="text-luxury-black/60 text-lg font-light tracking-wide max-w-2xl mx-auto uppercase text-sm">
                Curated fragrances and cinematic narratives by Michael
              </p>
              <div className="w-12 h-[1px] bg-gold mx-auto mt-8 opacity-50"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
              {/* Perfumes Section */}
              <section>
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-[1px] bg-gold opacity-50"></div>
                  <h3 className="text-2xl font-display tracking-widest uppercase">The Fragrance Collection</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  {perfumes.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ y: -8 }}
                      onClick={() => item.inStock ? addToCart(item) : null}
                      className={`group relative bg-white border border-luxury-black/5 p-4 transition-all duration-700 cursor-pointer hover:shadow-2xl hover:shadow-gold/5 ${!item.inStock && 'opacity-60'}`}
                    >
                      <div className="aspect-[4/5] bg-luxury-cream relative overflow-hidden mb-6">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                          referrerPolicy="no-referrer"
                        />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-luxury-cream/80 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-[10px] tracking-[0.3em] uppercase font-medium text-luxury-black/60 border border-luxury-black/20 px-4 py-2">Out of Stock</span>
                          </div>
                        )}
                        {item.inStock && (
                          <div className="absolute inset-0 bg-luxury-black/0 group-hover:bg-luxury-black/5 transition-colors duration-500"></div>
                        )}
                      </div>
                      <div className="text-center">
                        <h4 className="font-display text-lg mb-1 group-hover:text-gold transition-colors duration-300">{item.name}</h4>
                        <p className="text-gold font-light tracking-widest text-sm mb-4">{item.price}</p>
                        <div className="w-full py-3 text-[10px] tracking-[0.3em] uppercase transition-all duration-500 border border-luxury-black/10 group-hover:border-luxury-black group-hover:bg-luxury-black group-hover:text-white">
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
                  <div className="w-12 h-[1px] bg-gold opacity-50"></div>
                  <h3 className="text-2xl font-display tracking-widest uppercase">Cinematic Narratives</h3>
                </div>
                <div className="grid grid-cols-1 gap-12">
                  {portfolio.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ x: 10 }}
                      onClick={() => handlePortfolioClick(item)}
                      className="group relative cursor-pointer border-b border-luxury-black/5 pb-12"
                    >
                      <div className="aspect-video bg-luxury-black overflow-hidden mb-6">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1.5s] grayscale group-hover:grayscale-0"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-2xl font-display italic mb-2 group-hover:text-gold transition-colors duration-300">{item.title}</h4>
                          <p className="text-luxury-black/40 text-[10px] tracking-[0.2em] uppercase font-medium">View Cinematic Work — 2025</p>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-luxury-black/10 flex items-center justify-center group-hover:border-gold group-hover:text-gold transition-all duration-500">
                          <Play size={14} fill="currentColor" className="ml-1" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>

            {/* Contact Form Section */}
            <section id="contact-section" className="mt-48 max-w-4xl mx-auto mb-24">
              <div className="text-center mb-20">
                <h2 className="text-4xl font-display italic mb-4">Inquiries & Bookings</h2>
                <div className="w-12 h-[1px] bg-gold mx-auto mb-6 opacity-50"></div>
                <p className="text-luxury-black/50 font-light tracking-wide uppercase text-xs">Let's create something timeless together</p>
              </div>

              <div className="bg-white border border-luxury-black/5 p-8 md:p-20 shadow-2xl shadow-gold/5">
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
                    <p className="text-luxury-black/50 font-light mb-12">Michael will be in touch with you shortly.</p>
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
              className="flex items-center gap-2 text-luxury-black/40 hover:text-gold mb-16 transition-colors text-[10px] tracking-[0.2em] uppercase font-medium"
            >
              <ArrowLeft size={16} />
              Return to Gallery
            </button>

            <div className="mb-24">
              <h2 className="text-5xl md:text-7xl font-display italic mb-8">{selectedService.title}</h2>
              <div className="w-12 h-[1px] bg-gold mb-8 opacity-50"></div>
              <p className="text-luxury-black/60 text-lg font-light max-w-3xl leading-relaxed">{selectedService.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {selectedService.works.map((work) => (
                <div key={work.id} className="group">
                  <div className="aspect-video relative overflow-hidden bg-luxury-black mb-8">
                    <img 
                      src={work.image} 
                      alt={work.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] grayscale group-hover:grayscale-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-6 right-6">
                      <span className="bg-luxury-cream/90 backdrop-blur px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-luxury-black shadow-sm">
                        {work.type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display italic mb-2">{work.title}</h3>
                    <p className="text-luxury-black/40 text-[10px] tracking-[0.2em] uppercase font-medium">Cinematography by Michael</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-32 bg-luxury-black p-12 md:p-24 text-center text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-4xl md:text-6xl font-display italic mb-8">Capture Your Moment</h3>
                <p className="text-white/60 mb-12 max-w-xl mx-auto font-light leading-relaxed">Let's translate your vision into a cinematic masterpiece. Contact us today to discuss your project.</p>
                <button 
                  onClick={() => {
                    setView('home');
                    setTimeout(() => {
                      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="bg-gold text-white px-12 py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-white hover:text-luxury-black transition-all duration-500"
                >
                  Request a Consultation
                </button>
              </div>
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-gold to-transparent"></div>
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
              className="flex items-center gap-2 text-luxury-black/40 hover:text-gold mb-16 transition-colors text-[10px] tracking-[0.2em] uppercase font-medium"
            >
              <ArrowLeft size={16} />
              Continue Selection
            </button>

            <h2 className="text-4xl font-display italic mb-12">Your Selection</h2>

            {cart.length === 0 ? (
              <div className="bg-white border border-luxury-black/5 p-20 text-center shadow-2xl shadow-gold/5">
                <div className="w-20 h-20 border border-luxury-black/10 text-luxury-black/20 rounded-full flex items-center justify-center mx-auto mb-8">
                  <ShoppingCart size={32} strokeWidth={1} />
                </div>
                <p className="text-luxury-black/40 font-light text-lg mb-12">Your collection is currently empty</p>
                <button 
                  onClick={() => setView('home')}
                  className="bg-luxury-black text-white px-12 py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500"
                >
                  Explore Fragrances
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="bg-white border border-luxury-black/5 shadow-2xl shadow-gold/5 overflow-hidden">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-8 p-8 border-b border-luxury-black/5 last:border-0">
                      <div className="w-24 h-24 bg-luxury-cream overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover grayscale"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-xl italic mb-1">{item.name}</h3>
                        <p className="text-gold font-light tracking-widest text-sm">{item.price}</p>
                      </div>
                      <div className="flex items-center gap-6 border border-luxury-black/10 px-4 py-2">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="text-luxury-black/40 hover:text-luxury-black transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="text-luxury-black/40 hover:text-luxury-black transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-luxury-black/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-luxury-black/5 p-12 shadow-2xl shadow-gold/5">
                  <div className="flex justify-between items-center mb-12">
                    <span className="text-luxury-black/40 tracking-[0.2em] uppercase text-[10px] font-semibold">Total Investment</span>
                    <span className="text-3xl font-display italic">
                      ₦{cartTotal.toLocaleString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setView('checkout-form')}
                    className="w-full bg-luxury-black text-white py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500 shadow-xl shadow-luxury-black/10"
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
              className="flex items-center gap-2 text-luxury-black/40 hover:text-gold mb-16 transition-colors text-[10px] tracking-[0.2em] uppercase font-medium"
            >
              <ArrowLeft size={16} />
              Return to Selection
            </button>

            <div className="bg-white border border-luxury-black/5 p-8 md:p-20 shadow-2xl shadow-gold/5">
              <h2 className="text-3xl font-display italic mb-12 flex items-center gap-4">
                <CreditCard className="text-gold" strokeWidth={1} />
                Checkout
              </h2>
              <form onSubmit={handleCheckout} className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light placeholder:text-luxury-black/20"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light placeholder:text-luxury-black/20"
                  />
                </div>
                <div className="pt-12 border-t border-luxury-black/5">
                  <div className="flex justify-between items-center mb-12">
                    <span className="text-luxury-black/40 tracking-[0.2em] uppercase text-[10px] font-semibold">Final Investment</span>
                    <span className="text-2xl font-display italic">₦{cartTotal.toLocaleString()}</span>
                  </div>
                  <button 
                    disabled={formStatus === 'submitting'}
                    type="submit"
                    className="w-full bg-luxury-black text-white py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500 shadow-xl shadow-luxury-black/10 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {formStatus === 'submitting' ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Secure Payment with Paystack'
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
            <div className="w-24 h-24 border border-gold text-gold rounded-full flex items-center justify-center mx-auto mb-12">
              <CheckCircle2 size={40} strokeWidth={1} />
            </div>
            <h2 className="text-4xl font-display italic mb-6">Selection Confirmed</h2>
            <p className="text-luxury-black/50 font-light text-lg mb-16 leading-relaxed">
              Thank you for your investment. Michael will contact you shortly to arrange the delivery of your curated fragrances.
            </p>
            <button 
              onClick={() => setView('home')}
              className="bg-luxury-black text-white px-16 py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500"
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
            <div className="bg-white border border-luxury-black/5 p-12 shadow-2xl shadow-gold/5">
              <div className="text-center mb-12">
                <div className="w-16 h-16 border border-luxury-black/10 text-luxury-black/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LayoutDashboard size={24} strokeWidth={1} />
                </div>
                <h2 className="text-2xl font-display italic">Administrative Access</h2>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Username</label>
                  <input 
                    required
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Password</label>
                  <input 
                    required
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-luxury-black/10 py-4 focus:border-gold outline-none transition-all font-light"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-luxury-black text-white py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500"
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
            <div className="flex justify-between items-end mb-16 pb-8 border-b border-luxury-black/5">
              <div>
                <h2 className="text-4xl font-display italic mb-2">Management Console</h2>
                <p className="text-luxury-black/40 text-[10px] tracking-[0.2em] uppercase font-medium">Divinegrace Administrative Access</p>
              </div>
              <button 
                onClick={() => { setIsAdmin(false); setView('home'); }}
                className="flex items-center gap-2 text-luxury-black/40 hover:text-red-400 transition-colors text-[10px] tracking-[0.2em] uppercase font-medium"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>

            <div className="flex gap-12 mb-16 overflow-x-auto pb-4 no-scrollbar">
              {[
                { id: 'orders', label: 'Orders', icon: Package },
                { id: 'messages', label: 'Messages', icon: MessageSquare },
                { id: 'perfumes', label: 'Perfumes', icon: Droplets },
                { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as any)}
                  className={`flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase font-semibold transition-all ${adminTab === tab.id ? 'text-gold' : 'text-luxury-black/30 hover:text-luxury-black'}`}
                >
                  <tab.icon size={16} strokeWidth={1.5} />
                  {tab.label}
                  {adminTab === tab.id && <motion.div layoutId="activeTab" className="w-1 h-1 bg-gold rounded-full ml-1" />}
                </button>
              ))}
            </div>

            <div className="bg-white border border-luxury-black/5 shadow-2xl shadow-gold/5 overflow-hidden">
              {adminTab === 'orders' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-luxury-cream border-b border-luxury-black/5">
                      <tr>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-bold text-luxury-black/40">Customer</th>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-bold text-luxury-black/40">Investment</th>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-bold text-luxury-black/40">Collection</th>
                        <th className="px-8 py-6 text-[10px] tracking-[0.2em] uppercase font-bold text-luxury-black/40">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-black/5">
                      {adminData.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-luxury-cream/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="font-display text-lg italic">{order.customerName}</div>
                            <div className="text-[10px] text-luxury-black/40 font-medium">{order.customerEmail}</div>
                          </td>
                          <td className="px-8 py-6 font-display text-lg text-gold italic">₦{order.totalAmount.toLocaleString()}</td>
                          <td className="px-8 py-6 text-xs font-light">
                            {JSON.parse(order.items).map((i: any, idx: number) => (
                              <div key={idx} className="mb-1">{i.name} <span className="text-luxury-black/30 ml-1">x{i.quantity}</span></div>
                            ))}
                          </td>
                          <td className="px-8 py-6 text-[10px] tracking-[0.1em] text-luxury-black/40 font-medium">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'messages' && (
                <div className="divide-y divide-luxury-black/5">
                  {adminData.messages.map((msg) => (
                    <div key={msg.id} className="p-12 hover:bg-luxury-cream/30 transition-colors">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="font-display text-2xl italic mb-1">{msg.name}</h3>
                          <p className="text-gold text-[10px] tracking-[0.2em] uppercase font-semibold">{msg.email}</p>
                        </div>
                        <span className="text-[8px] tracking-[0.3em] uppercase px-3 py-1 border border-gold text-gold font-bold">
                          {msg.service}
                        </span>
                      </div>
                      <p className="text-luxury-black/60 font-light leading-relaxed italic text-lg">"{msg.message}"</p>
                      <p className="text-[10px] tracking-[0.1em] text-luxury-black/30 mt-8 font-medium">{new Date(msg.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}

              {adminTab === 'perfumes' && (
                <div className="p-12">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-2xl font-display italic">Fragrance Inventory</h3>
                    <button 
                      onClick={() => setEditingPerfume({ name: '', price: '₦0', priceValue: 0, image: '', inStock: 1 })}
                      className="bg-luxury-black text-white px-8 py-3 text-[10px] tracking-[0.2em] uppercase font-medium hover:bg-gold transition-all"
                    >
                      Add New Scent
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {perfumes.map((p) => (
                      <div key={p.id} className="bg-luxury-cream/30 border border-luxury-black/5 p-6 group">
                        <img src={p.image} className="w-full aspect-square object-cover mb-6 grayscale group-hover:grayscale-0 transition-all duration-700" />
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-display text-lg italic">{p.name}</h4>
                            <p className="text-gold text-sm tracking-widest">{p.price}</p>
                          </div>
                          <span className={`text-[8px] tracking-[0.2em] uppercase px-2 py-1 border ${p.inStock ? 'border-gold text-gold' : 'border-luxury-black/20 text-luxury-black/40'}`}>
                            {p.inStock ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingPerfume(p)}
                            className="flex-1 border border-luxury-black/10 py-3 text-[9px] tracking-[0.2em] uppercase hover:border-luxury-black transition-all"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePerfume(p.id)}
                            className="px-4 border border-luxury-black/10 text-luxury-black/20 hover:text-red-400 hover:border-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'portfolio' && (
                <div className="p-12">
                  <h3 className="text-2xl font-display italic mb-12">Cinematic Portfolio</h3>
                  <div className="grid grid-cols-1 gap-12">
                    {portfolio.map((p) => (
                      <div key={p.id} className="flex flex-col md:flex-row gap-8 items-center border-b border-luxury-black/5 pb-12">
                        <img src={p.image} className="w-full md:w-64 aspect-video object-cover grayscale" />
                        <div className="flex-1">
                          <h4 className="text-2xl font-display italic mb-2">{p.title}</h4>
                          <p className="text-luxury-black/40 text-sm font-light mb-6 leading-relaxed">{p.description}</p>
                          <button 
                            onClick={() => setEditingPortfolio(p)}
                            className="border border-luxury-black/10 px-8 py-3 text-[10px] tracking-[0.2em] uppercase font-medium hover:border-luxury-black transition-all"
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
                  className="fixed inset-0 z-[60] bg-luxury-black/80 backdrop-blur-md flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.98, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-white border border-luxury-black/5 w-full max-w-lg overflow-hidden shadow-2xl"
                  >
                    <div className="p-8 border-b border-luxury-black/5 flex justify-between items-center">
                      <h3 className="text-2xl font-display italic">{editingPerfume.id ? 'Edit Fragrance' : 'New Fragrance'}</h3>
                      <button onClick={() => setEditingPerfume(null)} className="text-luxury-black/20 hover:text-luxury-black transition-colors"><X size={20} /></button>
                    </div>
                    <form onSubmit={handleUpdatePerfume} className="p-8 space-y-8">
                      <div className="space-y-2">
                        <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Fragrance Name</label>
                        <input 
                          required value={editingPerfume.name} 
                          onChange={e => setEditingPerfume({...editingPerfume, name: e.target.value})}
                          className="w-full bg-transparent border-b border-luxury-black/10 py-3 focus:border-gold outline-none transition-all font-light"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Display Price</label>
                          <input 
                            required value={editingPerfume.price} 
                            onChange={e => setEditingPerfume({...editingPerfume, price: e.target.value})}
                            className="w-full bg-transparent border-b border-luxury-black/10 py-3 focus:border-gold outline-none transition-all font-light"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Numeric Value</label>
                          <input 
                            required type="number" value={editingPerfume.priceValue} 
                            onChange={e => setEditingPerfume({...editingPerfume, priceValue: parseInt(e.target.value)})}
                            className="w-full bg-transparent border-b border-luxury-black/10 py-3 focus:border-gold outline-none transition-all font-light"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/40">Image URL</label>
                        <input 
                          required value={editingPerfume.image} 
                          onChange={e => setEditingPerfume({...editingPerfume, image: e.target.value})}
                          className="w-full bg-transparent border-b border-luxury-black/10 py-3 focus:border-gold outline-none transition-all font-light"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" checked={!!editingPerfume.inStock} 
                          onChange={e => setEditingPerfume({...editingPerfume, inStock: e.target.checked ? 1 : 0})}
                          id="inStockCheck"
                          className="w-4 h-4 accent-gold"
                        />
                        <label htmlFor="inStockCheck" className="text-[10px] tracking-[0.2em] uppercase font-semibold text-luxury-black/60">Available in Collection</label>
                      </div>
                      <button type="submit" className="w-full bg-luxury-black text-white py-5 text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-gold transition-all duration-500">
                        Save Fragrance Details
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
      <footer className="bg-white border-t border-luxury-black/5 py-24 px-6 mt-48">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-24">
          <div>
            <h3 className="text-2xl font-display font-medium tracking-widest uppercase mb-8">Divinegrace</h3>
            <p className="text-luxury-black/50 font-light leading-relaxed">Premium perfumes and cinematic storytelling by Michael. Based in Benin City, Nigeria.</p>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-bold mb-8 text-luxury-black/40">Contact</h4>
            <div className="space-y-4 text-luxury-black/60 font-light">
              <a href="tel:+2348138329374" className="flex items-center gap-3 hover:text-gold transition-colors">
                <Phone size={16} strokeWidth={1.5} />
                +234 813 832 9374
              </a>
              <a href="mailto:osmosistrade7@gmail.com" className="flex items-center gap-3 hover:text-gold transition-colors">
                <Mail size={16} strokeWidth={1.5} />
                osmosistrade7@gmail.com
              </a>
              <a href="https://instagram.com" className="flex items-center gap-3 hover:text-gold transition-colors">
                <Instagram size={16} strokeWidth={1.5} />
                @divinegrace_perfumes
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-bold mb-8 text-luxury-black/40">Administrative</h4>
            <button 
              onClick={() => setView('admin-login')}
              className="text-luxury-black/40 hover:text-gold flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase font-medium transition-colors"
            >
              <LayoutDashboard size={16} strokeWidth={1.5} />
              Access Dashboard
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-12 border-t border-luxury-black/5 text-center text-luxury-black/30 text-[10px] tracking-[0.2em] uppercase font-medium">
          © 2025 Divinegrace perfumes. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
