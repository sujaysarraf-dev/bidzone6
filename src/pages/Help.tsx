import React from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Cpu, 
  Layers, 
  Code2, 
  Rocket, 
  ShieldCheck, 
  Globe, 
  Zap,
  CheckCircle2,
  Database,
  Cloud,
  Layout,
  MessageSquare,
  Search,
  Bell
} from 'lucide-react';

const HelpPage = () => {
  const techStack = [
    { name: 'Vite + React 19', icon: <Rocket className="text-blue-400" />, desc: 'Ultra-fast build tool and the latest React for high performance.' },
    { name: 'Tailwind CSS v4', icon: <Layout className="text-cyan-400" />, desc: 'Modern styling engine for premium, responsive UI/UX.' },
    { name: 'Supabase', icon: <Database className="text-emerald-400" />, desc: 'Robust backend-as-a-service for authentication and real-time database.' },
    { name: 'Netlify Functions', icon: <Cloud className="text-indigo-400" />, desc: 'Serverless architecture for AI chatbot and admin tasks.' },
    { name: 'Google Gemini AI', icon: <Zap className="text-purple-400" />, desc: 'Cutting-edge LLM integration for smart auction navigation.' },
    { name: 'Framer Motion', icon: <Zap className="text-pink-400" />, desc: 'Fluid animations and professional transitions.' }
  ];

  const libraries = [
    'Lucide React (Icons)',
    'React Router Dom (Navigation)',
    'React Hot Toast (Notifications)',
    'Recharts (Data Visualization)',
    'clsx & tailwind-merge (Styling)',
    'date-fns (Time Management)',
    'Firebase (Legacy File Support)'
  ];

  const faq = [
    { q: 'How do I place a bid?', a: 'Navigate to any auction, enter your amount in the bid card, and click "Place Bid". You must be logged in.' },
    { q: 'Can I contact the institution?', a: 'Yes! Use the "Ask Institution a Question" form right on the auction details page.' },
    { q: 'Are my funds safe?', a: 'Absolutely. Bidzone uses an escrow-like protection system where funds are only released after verification.' },
    { q: 'How do I list an asset?', a: 'Institutions can use the "Create Auction" button on their dashboard to list new assets.' }
  ];

  const sections = [
    {
      title: "Why Bidzone Was Made",
      content: "Bidzone was created to solve the lack of transparency and accessibility in traditional physical asset auctions in Nepal. It bridges the gap between financial institutions and potential buyers through a modern, digital-first approach.",
      icon: <Globe size={24} className="text-blue-500" />
    },
    {
      title: "Why It Stands Out",
      content: "Unlike traditional platforms, Bidzone leverages AI for user navigation, uses serverless functions for critical security, and provides a real-time, premium bidding experience with zero lag.",
      icon: <ShieldCheck size={24} className="text-emerald-500" />
    },
    {
      title: "MVP Highlights",
      content: "Our MVP includes real-time bidding, distinct Buyer/Institution/Admin roles, complex search/filtering, AI-powered chatbot support, and a complete enquiry system.",
      icon: <CheckCircle2 size={24} className="text-neutral-900" />
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6 tracking-tight"
          >
            Project <span className="text-neutral-400">Metadata</span>
          </motion.h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about the technical foundation, architecture, and goals of the Bidzone platform.
          </p>
        </div>

        {/* Major Sections */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {sections.map((section, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                {section.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{section.title}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-10 flex items-center gap-3">
            <Cpu className="text-neutral-400" /> The Tech Stack
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {techStack.map((tech, i) => (
              <div key={i} className="flex gap-6 p-6 bg-white border border-neutral-100 rounded-2xl shadow-sm hover:border-neutral-900 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  {tech.icon}
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">{tech.name}</h4>
                  <p className="text-sm text-neutral-500">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Libraries & Tools */}
        <div className="grid md:grid-cols-2 gap-12 mb-20 items-center">
          <div className="bg-neutral-900 p-12 rounded-[3rem] text-white">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <Layers className="text-emerald-400" /> Core Libraries
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {libraries.map((lib, i) => (
                <div key={i} className="flex items-center gap-3 text-neutral-300">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {lib}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <MessageSquare className="text-neutral-400" /> Common Inquiries
            </h2>
            <p className="text-neutral-500 mb-8 italic">"What users usually ask about Bidzone..."</p>
            <div className="space-y-4">
              {faq.map((item, i) => (
                <div key={i} className="p-6 bg-white border border-neutral-100 rounded-2xl">
                  <h4 className="font-bold text-neutral-900 mb-2">Q: {item.q}</h4>
                  <p className="text-sm text-neutral-500">A: {item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Callout */}
        <div className="bg-blue-600 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">Stand Out from the Rest</h2>
          <p className="text-blue-100 max-w-2xl mx-auto mb-10 text-lg relative z-10 font-medium">
            Bidzone isn't just a bidding website—it's a mission to digitize Nepal's financial auction ecosystem with transparency and intelligence.
          </p>
          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <div className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold flex items-center gap-2">
              <Bell size={16} /> Real-time Alerts
            </div>
            <div className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold flex items-center gap-2">
              <Search size={16} /> Advanced Filtering
            </div>
            <div className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold flex items-center gap-2">
              <Cpu size={16} /> AI Integration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
