"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "motion/react";

export default function KVKKPage() {
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
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Kişisel Verilerin Korunması (KVKK)</h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">Son güncelleme: 10 Nisan 2026</p>
        </motion.div>

        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-loose font-medium">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">1. Veri Sorumlusu</h2>
            <p>
              Shen Ajans ("Şirket") olarak, hizmetlerimizden faydalanan kullanıcılarımızın kişisel verilerinin korunmasına büyük önem veriyoruz. 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla hareket etmekteyiz.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">2. İşlenen Kişisel Veriler</h2>
            <p>
              Hizmetlerimizi kullanırken; ad-soyad, e-posta adresi, yüklediğiniz görseller ve kullanım istatistikleriniz gibi veriler, size daha kaliteli ve hızlı hizmet sunabilmek adına işlenmektedir.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">3. Veri İşleme Amaçları</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Üyelik işlemlerinin gerçekleştirilmesi ve hesabın yönetilmesi.</li>
              <li>Yapay zeka modellerimiz aracılığıyla görsel üretim ve düzenleme hizmetinin sunulması.</li>
              <li>Kullanıcı deneyiminin iyileştirilmesi ve teknik destek sağlanması.</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">4. Verilerin Aktarılması</h2>
            <p>
              Kişisel verileriniz, yasal mevzuat gereği yetkili mercilere veya hizmetlerimizin sürdürülebilirliği adına iş ortaklarımıza (bulut bilişim, ödeme sistemleri vb.) KVKK standartlarına uygun olarak aktarılabilir.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">5. Haklarınız</h2>
            <p>
              KVKK'nın 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, yanlış işlenen verilerin düzeltilmesini isteme ve verilerinizin silinmesini talep etme haklarına sahipsiniz. Taleplerinizi info@shennext.com adresine iletebilirsiniz.
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
