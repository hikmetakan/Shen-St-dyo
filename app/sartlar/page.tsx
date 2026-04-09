"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { motion } from "motion/react";

export default function SartlarPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-amber-500/30 p-6 md:p-12 lg:p-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Anasayfaya Dön
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-amber-500/10 w-fit p-3 rounded-2xl border border-amber-500/20 mb-6">
            <Scale className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Kullanım Şartları</h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">Son güncelleme: 10 Nisan 2026</p>
        </motion.div>

        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-loose font-medium">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">1. Kabul Edilme</h2>
            <p>
              Shen Stüdyo platformuna erişerek veya kullanarak, bu Kullanım Şartları'nı okuduğunuzu, anladığınızı ve bunlara bağlı kalmayı kabul ettiğinizi beyan etmiş olursunuz.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">2. Hizmet Tanımı</h2>
            <p>
              Shen Stüdyo, yapay zeka teknolojilerini kullanarak görsel üretim, düzenleme ve içerik oluşturma hizmetleri sunar. Hizmetlerimizin kapsamı ve özellikleri zaman zaman güncellenebilir.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">3. Fikri Mülkiyet Hakları</h2>
            <p>
              Platform üzerinden ürettiğiniz görsellerin kullanım hakları tamamen size aittir. Ancak, platformun yazılımı, tasarımı ve algoritmaları Shen Ajans'ın mülkiyetindedir ve izinsiz kopyalanamaz.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">4. Kullanıcı Sorumlulukları</h2>
            <p>
              Kullanıcılar, yükledikleri içeriklerin yasal olduğunu ve üçüncü şahısların haklarını ihlal etmediğini taahhüt eder. Şiddet, nefret söylemi veya telif hakkı ihlali içeren paylaşımlar yasaktır.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">5. İptal ve İade Koşulları</h2>
            <p>
              Kredi sistemi üzerinden satın alınan servisler dijital içerik kapsamındadır ve kural olarak iadesi mümkün değildir. Teknik hatalar nedeniyle oluşan kayıplarda info@shennext.com üzerinden destek sağlanacaktır.
            </p>
          </section>
        </div>

        <footer className="pt-12 border-t border-slate-800/50 text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">
          SHEN STÜDYO © 2026
        </footer>
      </div>
    </div>
  );
}
