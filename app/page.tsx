"use client";

import React from "react";
import { 
  Sparkles, 
  Palette, 
  FileText, 
  Edit3, 
  ArrowRight,
  Instagram,
  ArrowUpRight
} from "lucide-react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Show } from "@/components/clerk-wrapper";
import Link from "next/link";
import { motion } from "motion/react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-amber-500/30 overflow-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50 flex justify-between items-center px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">
            SHEN STÜDYO
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="https://instagram.com/shenajans" target="_blank" className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <Instagram className="w-4 h-4" /> @shenajans
          </a>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl text-xs font-bold transition-all">
                Giriş Yap
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/20">
                Kayıt Ol
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/studio">
              <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
                STÜDYOYA GİT <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </Show>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/40 border border-slate-700/50 rounded-full mb-8"
        >
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Yapay Zeka Destekli Fotoğrafçılık</span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight uppercase leading-[0.9] mb-8"
        >
          ÜRÜNLERİNİZİ <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
            Sanata Dönüştürün.
          </span>
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-medium leading-relaxed"
        >
          Shen Stüdyo, ürün fotoğraflarınızı kampanya görsellerine dönüştüren, SEO uyumlu açıklamalar üreten ve profesyonel düzenlemeler yapan yapay zeka ekosistemidir.
        </motion.p>

        {/* FEATURES GRID */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl"
        >
          {/* Feature 1 */}
          <FeatureCard 
            icon={<Palette className="w-8 h-8 text-amber-500" />}
            title="Görsel Oluşturma"
            description="Ürünlerinizi profesyonel stüdyo ortamlarına ve etkileyici manzaralara yerleştirin."
            href="/studio"
            delay={0}
          />

          {/* Feature 2 */}
          <FeatureCard 
            icon={<Edit3 className="w-8 h-8 text-amber-500" />}
            title="Görsel Düzenleme"
            description="Referans görseller kullanarak ürünlerinizde nokta atışı değişiklikler yapın."
            href="/studio"
            delay={0.1}
          />

          {/* Feature 3 */}
          <FeatureCard 
            icon={<FileText className="w-8 h-8 text-amber-500" />}
            title="Açıklama Üret"
            description="Pazaryerleri ve sosyal medya için saniyeler içinde SEO uyumlu metinler üretin."
            href="/studio"
            delay={0.2}
          />
        </motion.div>

        {/* FAQ SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="w-full max-w-4xl mt-32 space-y-12"
        >
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tight">Sıkça Sorulan Sorular</h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full" />
          </div>

          <div className="grid gap-4">
            <FAQItem 
              question="Shen Stüdyo nasıl çalışır?" 
              answer="Shen Stüdyo, yüklediğiniz ürün görsellerini gelişmiş yapay zeka modelleri ile analiz eder ve vizyonunuza uygun, profesyonel stüdyo kalitesinde görseller üretir." 
            />
            <FAQItem 
              question="Ürettiğim görsellerin kullanım hakları bana mı ait?" 
              answer="Evet, Shen Stüdyo üzerinden ürettiğiniz tüm görsellerin kullanım ve ticari hakları tamamen size aittir." 
            />
            <FAQItem 
              question="Her ürün için uygun mudur?" 
              answer="Kozmetik, teknoloji, tekstil, mobilya ve daha birçok kategori için optimize edilmiştir. Ürününüzün net bir görseli olması yeterlidir." 
            />
            <FAQItem 
              question="Kredi sistemi nasıl işliyor?" 
              answer="Her görsel üretimi ve düzenleme işlemi belirli bir kredi karşılığında gerçekleştirilir. 1K çözünürlük 1 kredi, 2K 2 kredi ve 4K 4 kredi olarak ücretlendirilir." 
            />
          </div>
        </motion.section>
      </main>

      {/* FOOTER - CLEAN VERSION */}
      <footer className="relative z-10 py-12 px-6 border-t border-slate-800/50 bg-[#0B0F1A]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-black tracking-tighter uppercase">SHEN STÜDYO</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Link href="/kvkk" className="hover:text-amber-500 transition-colors">KVKK</Link>
            <Link href="/sartlar" className="hover:text-amber-500 transition-colors">ŞARTLAR</Link>
            <Link href="/iletisim" className="hover:text-amber-500 transition-colors">İLETİŞİM</Link>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            © 2026 SHEN AJANS. TÜM HAKLARI SAKLIDIR.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden transition-all hover:border-amber-500/30">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex justify-between items-center gap-4"
      >
        <span className="text-sm font-black uppercase tracking-tight text-white">{question}</span>
        <span className={`text-amber-500 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
          <Sparkles className="w-4 h-4" />
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="p-6 pt-0 text-slate-400 text-xs font-medium leading-relaxed border-t border-slate-800/30">
          {answer}
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, href, delay }: { icon: React.ReactNode, title: string, description: string, href: string, delay: number }) {
  return (
    <div className="group relative">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <div className="cursor-pointer text-left h-full bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] hover:bg-slate-800/50 hover:border-amber-500/30 transition-all duration-500 flex flex-col gap-6">
            <div className="bg-slate-800 p-4 rounded-2xl w-fit group-hover:bg-amber-500/10 transition-colors">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 group-hover:text-amber-400 transition-colors">
                {title} <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href={href} className="block text-left h-full bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] hover:bg-slate-800/50 hover:border-amber-500/30 transition-all duration-500 flex flex-col gap-6">
          <div className="bg-slate-800 p-4 rounded-2xl w-fit group-hover:bg-amber-500/10 transition-colors">
            {icon}
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 group-hover:text-amber-400 transition-colors">
              {title} <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
            </h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              {description}
            </p>
          </div>
        </Link>
      </Show>
    </div>
  );
}
