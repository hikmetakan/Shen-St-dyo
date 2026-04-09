"use client";

import React from "react";
import { Sparkles, ArrowLeft, Mail, Phone, MapPin, Instagram } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-amber-500/30 overflow-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-50 flex justify-between items-center px-6 py-6 max-w-7xl mx-auto font-sans">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tighter uppercase">SHEN STÜDYO</h1>
        </Link>
        <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> ANA SAYFAYA DÖN
        </Link>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">İletişim</h1>
            <div className="h-1 w-20 bg-amber-500 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <p className="text-slate-400 text-lg font-medium leading-relaxed">
                Her türlü soru, görüş ve iş birliği talepleriniz için bizimle iletişime geçebilirsiniz. Shen Ajans ekibi olarak size yardımcı olmaktan mutluluk duyarız.
              </p>
              
              <div className="space-y-6">
                <ContactItem 
                  icon={<Mail className="w-6 h-6 text-amber-500" />}
                  title="E-posta"
                  content="info@shenajans.com"
                />
                <ContactItem 
                  icon={<Phone className="w-6 h-6 text-amber-500" />}
                  title="Telefon"
                  content="+90 (555) 000 00 00"
                />
                <ContactItem 
                  icon={<MapPin className="w-6 h-6 text-amber-500" />}
                  title="Adres"
                  content="Shen Ajans Teknoloji Ofisi, İstanbul, Türkiye"
                />
                <div className="pt-4">
                  <a href="https://instagram.com/shenajans" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl text-xs font-bold transition-all">
                    <Instagram className="w-4 h-4 text-pink-500" /> @shenajans
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight">Mesaj Gönderin</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ad Soyad</label>
                  <input type="text" className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all" placeholder="Adınız" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-posta</label>
                  <input type="email" className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all" placeholder="E-posta Adresiniz" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mesaj</label>
                  <textarea className="w-full h-32 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all resize-none" placeholder="Nasıl yardımcı olabiliriz?" />
                </div>
                <button className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20">
                  GÖNDER
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 py-12 px-6 border-t border-slate-800/50 bg-[#0B0F1A]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-black tracking-tighter uppercase">SHEN STÜDYO</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            © 2026 SHEN AJANS. TÜM HAKLARI SAKLIDIR.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactItem({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
        {icon}
      </div>
      <div>
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
        <p className="text-white font-bold">{content}</p>
      </div>
    </div>
  );
}
