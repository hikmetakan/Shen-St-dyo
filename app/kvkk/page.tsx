"use client";

import React from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function KVKKPage() {
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
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">KVKK Aydınlatma Metni</h1>
            <div className="h-1 w-20 bg-amber-500 rounded-full" />
          </div>

          <div className="prose prose-invert prose-amber max-w-none space-y-8 text-slate-300 font-medium leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">1. Veri Sorumlusu</h2>
              <p>
                Shen Ajans ("Şirket") olarak, kişisel verilerinizin güvenliği hususuna azami hassasiyet göstermekteyiz. Bu bilinçle, Şirket olarak ürün ve hizmetlerimizden faydalanan kişiler dahil, Şirket ile ilişkili tüm şahıslara ait her türlü kişisel verilerin 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”)’na uygun olarak işlenerek, muhafaza edilmesine büyük önem vermekteyiz.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">2. Kişisel Verilerin Toplanması, İşlenmesi ve İşleme Amaçları</h2>
              <p>
                Kişisel verileriniz, Şirketimiz tarafından sağlanan hizmet ve Şirketimizin ticari faaliyetlerine bağlı olarak değişkenlik gösterebilmekle birlikte; otomatik ya da otomatik olmayan yöntemlerle, Şirketimiz birimleri ve ofisleri, internet sitesi, sosyal medya mecraları, mobil uygulamalar ve benzeri vasıtalarla sözlü, yazılı ya da elektronik olarak toplanabilecektir.
              </p>
              <p>
                Toplanan kişisel verileriniz, Şirketimiz tarafından sunulan ürün ve hizmetlerden sizleri faydalandırmak için gerekli çalışmaların iş birimlerimiz tarafından yapılması, ürün ve hizmetlerimizin beğeni, kullanım alışkanlıkları ve ihtiyaçlarınıza göre özelleştirilerek sizlere önerilmesi için gerekli çalışmaların yürütülmesi amaçlarıyla KVKK’nın 5. ve 6. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları dahilinde işlenecektir.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h2>
              <p>
                Toplanan kişisel verileriniz; Şirketimiz tarafından sunulan ürün ve hizmetlerden sizleri faydalandırmak için gerekli çalışmaların iş birimlerimiz tarafından yapılması, Şirketimiz tarafından sunulan ürün ve hizmetlerin sizlerin beğeni, kullanım alışkanlıkları ve ihtiyaçlarınıza göre özelleştirilerek sizlere önerilmesi amaçlarıyla; iş ortaklarımıza, tedarikçilerimize, kanunen yetkili kamu kurumlarına ve özel kişilere aktarılabilecektir.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">4. Kişisel Veri Sahibinin KVKK’nın 11. Maddesinde Sayılan Hakları</h2>
              <p>
                Kişisel veri sahipleri olarak, haklarınıza ilişkin taleplerinizi işbu Aydınlatma Metni’nde aşağıda düzenlenen yöntemlerle Şirketimize iletmeniz durumunda Şirketimiz talebin niteliğine göre talebi en kısa sürede ve en geç otuz gün içinde ücretsiz olarak sonuçlandıracaktır.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Kişisel veri işlenip işlenmediğini öğrenme,</li>
                <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,</li>
                <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
                <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme.</li>
              </ul>
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
