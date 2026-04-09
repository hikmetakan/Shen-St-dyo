"use client";

import React from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function TermsPage() {
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
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Kullanım Şartları</h1>
            <div className="h-1 w-20 bg-amber-500 rounded-full" />
          </div>

          <div className="prose prose-invert prose-amber max-w-none space-y-8 text-slate-300 font-medium leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">1. Giriş</h2>
              <p>
                Shen Stüdyo web sitesine hoş geldiniz. İşbu Kullanım Şartları ("Şartlar"), sitemizi ve sunduğumuz yapay zeka destekli ürün fotoğrafçılığı hizmetlerini kullanımınızı düzenler. Sitemizi kullanarak, bu şartlara uymayı kabul etmiş sayılırsınız.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">2. Hizmet Tanımı</h2>
              <p>
                Shen Stüdyo, kullanıcıların ürün görsellerinden yeni varyasyonlar üretmesine, ürün açıklamaları oluşturmasına ve dijital içerik düzenleme işlemleri yapmasına olanak tanıyan bir platformdur. Hizmetlerimiz yapay zeka modelleri aracılığıyla sunulmaktadır.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">3. Kullanıcı Sorumlulukları</h2>
              <p>
                Platformumuzu kullanırken yasalara ve genel ahlaka aykırı, üçüncü kişilerin haklarını ihlal eden veya telifli içerikleri izinsiz yüklemekten kaçınmalısınız. Oluşturulan içeriklerin kullanım sorumluluğu tamamen kullanıcıya aittir.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">4. Fikri Mülkiyet</h2>
              <p>
                Shen Stüdyo platformunun tüm tasarımı, logoları, yazılım kodları ve markası Shen Ajans'a aittir. Yapay zeka tarafından üretilen çıktıların ticari kullanım hakları, ilgili abonelik veya servis koşulları kapsamında kullanıcıya devredilmektedir.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">5. Değişiklikler</h2>
              <p>
                Shen Ajans, işbu Kullanım Şartları'nı dilediği zaman güncelleme hakkını saklı tutar. Değişiklikler sitede yayınlandığı andan itibaren geçerli olacaktır.
              </p>
            </section>
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
