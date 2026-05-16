// src/features/user/components/BannerCarousel.tsx

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isScrolled?: boolean;
}

const BannerCarousel: React.FC<Props> = ({ isScrolled }) => {
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const shuffledOrderRef = useRef<number[]>([]);
  const shuffleIndexRef = useRef<number>(0);

  // Função para gerar ordem aleatória dos índices
  const shuffleArray = (length: number): number[] => {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchBanners = async () => {
      try {
        const q = query(collection(db, 'banners'), where('active', '==', true));
        const snap = await getDocs(q);
        
        if (!isMounted) return;

        const now = new Date();
        const valid = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() }))
          .filter((b: any) => {
            const end = b.endDate?.toDate ? b.endDate.toDate() : new Date();
            return now <= end;
          });
        
        // Se os banners mudaram, gerar nova ordem aleatória
        const currentIds = valid.map((b: any) => b.id).join(',');
        const previousIds = activeBanners.map((b: any) => b.id).join(',');
        
        if (currentIds !== previousIds || shuffledOrderRef.current.length === 0) {
          shuffledOrderRef.current = shuffleArray(valid.length);
          shuffleIndexRef.current = 0;
          setCurrentIndex(shuffledOrderRef.current[0] || 0);
        }
        
        setActiveBanners(valid);
      } catch (error) {
        console.error("Erro ao carregar banners:", error);
      }
    };

    fetchBanners();

    const interval = setInterval(fetchBanners, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      shuffleIndexRef.current = (shuffleIndexRef.current + 1) % activeBanners.length;
      
      // Se completou um ciclo, reembaralhar
      if (shuffleIndexRef.current === 0) {
        shuffledOrderRef.current = shuffleArray(activeBanners.length);
      }
      
      setCurrentIndex(shuffledOrderRef.current[shuffleIndexRef.current]);
    }, 4500);

    return () => clearInterval(timer);
  }, [activeBanners]);

  if (activeBanners.length === 0) return <div className={`w-full bg-[#0a2540] transition-all duration-300 ${isScrolled ? 'h-[190px]' : 'h-[224px] md:h-[280px]'}`} />;

  return (
    <div className={`relative w-full overflow-hidden bg-[#0a2540] transition-all duration-300 ease-in-out ${isScrolled ? 'h-[190px]' : 'h-[224px] md:h-[280px]'}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={activeBanners[currentIndex]?.id || 'fallback'}
          src={activeBanners[currentIndex]?.imageUrl || ''}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "linear" }}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/20 pointer-events-none transition-all duration-300" />
      {activeBanners.length > 1 && (
        <div className="absolute bottom-12 right-6 flex gap-2">
          {activeBanners.map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-6 bg-[#00d66f]' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;