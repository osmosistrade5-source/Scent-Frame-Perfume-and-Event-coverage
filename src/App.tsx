/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Camera, Droplets, Instagram, Mail, Phone, Send, User, ShoppingCart, ArrowLeft, Plus, Minus, Trash2, CheckCircle2, CreditCard, LayoutDashboard, LogOut, Settings, Package, MessageSquare, Image as ImageIcon, Eye, X, Save } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 py-4 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => setView('home')}>
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-600 tracking-tight">
              ScentFrame
            </h1>
          </div>
          
          <button 
            onClick={() => setView('cart')}
            className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
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
            <div className="text-center mb-16">
              <p className="text-gray-600 text-lg">Perfumes & Cinematography by Michael</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Perfumes Section */}
              <section>
                <div className="flex items-center gap-2 mb-8">
                  <Droplets className="text-emerald-500" size={28} />
                  <h2 className="text-2xl font-semibold">Perfumes for Sale</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {perfumes.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => item.inStock ? addToCart(item) : null}
                      className={`group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-100 transition-all cursor-pointer ${!item.inStock && 'opacity-60 grayscale'}`}
                    >
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {item.inStock ? (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <span className="bg-white text-emerald-600 font-bold px-4 py-2 rounded-full shadow-lg">
                              Add to Cart
                            </span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-red-500 text-white font-bold px-4 py-2 rounded-full shadow-lg">
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">{item.name}</h3>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${item.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {item.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                        <p className="text-emerald-600 font-bold text-xl">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Cinematography Section */}
              <section>
                <div className="flex items-center gap-2 mb-8">
                  <Camera className="text-emerald-500" size={28} />
                  <h2 className="text-2xl font-semibold">Cinematography Services</h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {portfolio.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handlePortfolioClick(item)}
                      className="group relative bg-gray-900 rounded-2xl overflow-hidden aspect-video shadow-sm border border-gray-100 cursor-pointer"
                    >
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                        <div>
                          <p className="text-white font-medium text-lg">{item.title}</p>
                          <p className="text-emerald-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View Previous Works →</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Contact Form Section */}
            <section id="contact-section" className="mt-24 max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                <p className="text-gray-600">Have a question about our perfumes or want to book a shoot? Send us a message!</p>
              </div>

              <div className="bg-white rounded-3xl shadow-xl shadow-emerald-900/5 p-8 md:p-12 border border-gray-100">
                {formStatus === 'success' ? (
                  <div className="py-12 text-center">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                    <p className="text-gray-600 mb-8">Thank you for reaching out. Michael will get back to you shortly.</p>
                    <button 
                      onClick={() => setFormStatus('idle')}
                      className="text-emerald-600 font-semibold hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User size={16} className="text-emerald-500" />
                          Full Name
                        </label>
                        <input 
                          required
                          name="name"
                          type="text" 
                          placeholder="John Doe"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Mail size={16} className="text-emerald-500" />
                          Email Address
                        </label>
                        <input 
                          required
                          name="email"
                          type="email" 
                          placeholder="john@example.com"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Service Interested In</label>
                      <select name="service" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white">
                        <option>Perfumes</option>
                        <option>Cinematography</option>
                        <option>Both</option>
                        <option>Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Your Message</label>
                      <textarea 
                        required
                        name="message"
                        rows={4}
                        placeholder="Tell us more about what you're looking for..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
                      ></textarea>
                    </div>

                    <button 
                      disabled={formStatus === 'submitting'}
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {formStatus === 'submitting' ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={20} />
                          Send Message
                        </>
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-5xl mx-auto px-4 py-12"
          >
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors font-medium"
            >
              <ArrowLeft size={20} />
              Back to Services
            </button>

            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-4">{selectedService.title}</h2>
              <p className="text-gray-600 text-lg max-w-2xl">{selectedService.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {selectedService.works.map((work) => (
                <div key={work.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={work.image} 
                      alt={work.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-600 shadow-sm">
                        {work.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{work.title}</h3>
                    <p className="text-gray-500 text-sm">Cinematography by Michael</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 bg-emerald-600 rounded-3xl p-8 md:p-12 text-center text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to book your shoot?</h3>
              <p className="text-emerald-50 mb-8 max-w-xl mx-auto">Let's create something amazing together. Contact us today to discuss your project.</p>
              <button 
                onClick={() => {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
              >
                Get a Quote
              </button>
            </div>
          </motion.main>
        )}

        {view === 'cart' && (
          <motion.main 
            key="cart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto px-4 py-12"
          >
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors font-medium"
            >
              <ArrowLeft size={20} />
              Back to Shopping
            </button>

            <h2 className="text-3xl font-bold mb-8">Your Cart</h2>

            {cart.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart size={32} />
                </div>
                <p className="text-gray-500 text-lg mb-6">Your cart is empty</p>
                <button 
                  onClick={() => setView('home')}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20"
                >
                  Browse Perfumes
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-0">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-20 h-20 object-cover rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-emerald-600 font-bold">{item.price}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-white rounded-md transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-white rounded-md transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600 text-lg">Total Amount</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      ₦{cartTotal.toLocaleString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setView('checkout-form')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
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
            className="max-w-xl mx-auto px-4 py-12"
          >
            <button 
              onClick={() => setView('cart')}
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors font-medium"
            >
              <ArrowLeft size={20} />
              Back to Cart
            </button>

            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <CreditCard className="text-emerald-600" />
                Checkout Details
              </h2>
              <form onSubmit={handleCheckout} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600">Total to Pay</span>
                    <span className="text-xl font-bold text-emerald-600">₦{cartTotal.toLocaleString()}</span>
                  </div>
                  <button 
                    disabled={formStatus === 'submitting'}
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {formStatus === 'submitting' ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={20} />
                        Pay Now with Paystack
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto px-4 py-24 text-center"
          >
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-gray-600 text-lg mb-12">
              Thank you for your purchase. Michael will contact you soon to arrange delivery.
            </p>
            <button 
              onClick={() => setView('home')}
              className="bg-emerald-600 text-white px-12 py-4 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:scale-105 transition-transform"
            >
              Back to Home
            </button>
          </motion.main>
        )}

        {view === 'admin-login' && (
          <motion.main 
            key="admin-login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto px-4 py-24"
          >
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LayoutDashboard size={32} />
                </div>
                <h2 className="text-2xl font-bold">Admin Login</h2>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Username</label>
                  <input 
                    required
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Password</label>
                  <input 
                    required
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg">
                  Login to Dashboard
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
            className="max-w-7xl mx-auto px-4 py-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <LayoutDashboard className="text-emerald-600" />
                Admin Dashboard
              </h2>
              <button 
                onClick={() => { setIsAdmin(false); setView('home'); }}
                className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-medium"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
              {[
                { id: 'orders', label: 'Orders', icon: Package },
                { id: 'messages', label: 'Messages', icon: MessageSquare },
                { id: 'perfumes', label: 'Perfumes', icon: Droplets },
                { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${adminTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {adminTab === 'orders' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Customer</th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Items</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminData.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4">
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-gray-500">{order.customerEmail}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-600">₦{order.totalAmount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm">
                            {JSON.parse(order.items).map((i: any, idx: number) => (
                              <div key={idx}>{i.name} x{i.quantity}</div>
                            ))}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'messages' && (
                <div className="divide-y divide-gray-100">
                  {adminData.messages.map((msg) => (
                    <div key={msg.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{msg.name}</h3>
                          <p className="text-emerald-600 text-sm">{msg.email}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full uppercase">
                          {msg.service}
                        </span>
                      </div>
                      <p className="text-gray-600 bg-gray-50 p-4 rounded-xl italic">"{msg.message}"</p>
                      <p className="text-xs text-gray-400 mt-4">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {adminTab === 'perfumes' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Manage Inventory</h3>
                    <button 
                      onClick={() => setEditingPerfume({ name: '', price: '₦0', priceValue: 0, image: '', inStock: 1 })}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                      <Plus size={18} /> Add New
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {perfumes.map((p) => (
                      <div key={p.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                        <img src={p.image} className="w-full h-32 object-cover rounded-xl mb-4" />
                        <h4 className="font-bold">{p.name}</h4>
                        <p className="text-emerald-600 font-bold mb-4">{p.price}</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingPerfume(p)}
                            className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-sm font-bold hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePerfume(p.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-6">Portfolio Management</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {portfolio.map((p) => (
                      <div key={p.id} className="flex gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <img src={p.image} className="w-32 h-32 object-cover rounded-xl" />
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{p.title}</h4>
                          <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description}</p>
                          <button 
                            onClick={() => setEditingPortfolio(p)}
                            className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold"
                          >
                            Edit Details
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
                  className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-3xl w-full max-w-lg overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-xl font-bold">{editingPerfume.id ? 'Edit Perfume' : 'Add Perfume'}</h3>
                      <button onClick={() => setEditingPerfume(null)}><X /></button>
                    </div>
                    <form onSubmit={handleUpdatePerfume} className="p-6 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Name</label>
                        <input 
                          required value={editingPerfume.name} 
                          onChange={e => setEditingPerfume({...editingPerfume, name: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg border"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Display Price (₦)</label>
                          <input 
                            required value={editingPerfume.price} 
                            onChange={e => setEditingPerfume({...editingPerfume, price: e.target.value})}
                            className="w-full px-4 py-2 rounded-lg border"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Numeric Value</label>
                          <input 
                            required type="number" value={editingPerfume.priceValue} 
                            onChange={e => setEditingPerfume({...editingPerfume, priceValue: parseInt(e.target.value)})}
                            className="w-full px-4 py-2 rounded-lg border"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Image URL</label>
                        <input 
                          required value={editingPerfume.image} 
                          onChange={e => setEditingPerfume({...editingPerfume, image: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg border"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" checked={!!editingPerfume.inStock} 
                          onChange={e => setEditingPerfume({...editingPerfume, inStock: e.target.checked ? 1 : 0})}
                          id="inStockCheck"
                        />
                        <label htmlFor="inStockCheck" className="text-sm font-semibold">In Stock</label>
                      </div>
                      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        <Save size={18} /> Save Changes
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
      <footer className="bg-white border-t border-gray-200 py-12 px-4 mt-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-xl font-bold text-emerald-600 mb-4">ScentFrame</h3>
            <p className="text-gray-500">Premium perfumes and cinematic storytelling. Based in Benin City, Nigeria.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact Us</h4>
            <div className="space-y-3 text-gray-600">
              <a href="tel:+2348000000000" className="flex items-center gap-2 hover:text-emerald-600 transition-colors">
                <Phone size={18} />
                +234 800 000 0000
              </a>
              <a href="https://instagram.com" className="flex items-center gap-2 hover:text-emerald-600 transition-colors">
                <Instagram size={18} />
                @scentframe_ng
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4">Admin</h4>
            <button 
              onClick={() => setView('admin-login')}
              className="text-gray-500 hover:text-emerald-600 flex items-center gap-2 text-sm"
            >
              <LayoutDashboard size={16} />
              Admin Dashboard
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm">
          © 2025 ScentFrame. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
