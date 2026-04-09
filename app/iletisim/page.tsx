"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { motion } from "motion/react";

export default function IletisimPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-amber-500/30 p-6 md:p-12 lg:p-24">
      <div className="max-w-5xl mx-auto space-y-16">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Anasayfaya Dön
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-amber-500/10 w-fit p-3 rounded-2xl border border-amber-500/20 mb-6">
            <Mail className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">Bize Ulaşın</h1>
          <p className="text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
            Sorularınız, önerileriniz veya teknik desteğe ihtiyacınız olduğunda profesyonel ekibimiz yardıma hazır.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Adres */}
          <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] space-y-6 hover:border-amber-500/30 transition-all">
            <div className="bg-slate-800 p-4 rounded-2xl w-fit">
              <MapPin className="w-6 h-6 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Adres</h3>
              <p className="text-sm font-bold leading-relaxed text-white">
                Perpa İş Merkezi A Blok Kat: 12 No: 1844 Şişli / İstanbul
              </p>
            </div>
          </div>

          {/* Telefon */}
          <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] space-y-6 hover:border-amber-500/30 transition-all">
            <div className="bg-slate-800 p-4 rounded-2xl w-fit">
              <Phone className="w-6 h-6 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Telefon</h3>
              <p className="text-sm font-black text-white text-xl">
                0532 725 75 25
              </p>
            </div>
          </div>

          {/* Mail */}
          <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] space-y-6 hover:border-amber-500/30 transition-all">
            <div className="bg-slate-800 p-4 rounded-2xl w-fit">
              <Mail className="w-6 h-6 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">E-Posta</h3>
              <p className="text-sm font-black text-white text-xl">
                info@shennext.com
              </p>
            </div>
          </div>
        </div>

        {/* HIZLI MESAJ FORMU (Opsiyonel Görsellik) */}
        <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-slate-800/50 rounded-[3rem] p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Hızlı Mesaj Gönder</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Talebinizi iletin, uzman ekibimiz en kısa sürede size geri dönüş sağlasın.
              </p>
            </div>
            <button className="px-12 py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-[2rem] font-black text-sm transition-all shadow-xl shadow-amber-500/20 flex items-center gap-3">
              İLETİŞİME GEÇ <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        <footer className="pt- w-full text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.6em]">
          SHEN STÜDYO © 2026
        </footer>
      </div>
    </div>
  );
}
