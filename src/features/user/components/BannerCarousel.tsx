// src/features/user/components/BannerCarousel.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../store/useStore';

interface Props {
  isScrolled?: boolean;
}

const BannerCarousel: React.FC<Props> = ({ isScrolled }) => {
  const { currentUser } = useStore();
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const userZipBase = currentUser.zipCode?.substring(0, 4);

    const q = query(collection(db, 'banners'), where('active', '==', true));
    
    // CORREÇÃO: Adicionado (snap: any) e (d: any) para TS Estrito
    const unsubscribe = onSnapshot(q, (snap: any) => {
      const now = new Date();
      const valid = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((b: any) => {
          const start = b.startDate && typeof b.startDate.toDate === 'function' ? b.startDate.toDate() : new Date();
          const end = b.endDate && typeof b.endDate.toDate === 'function' ? b.endDate.toDate() : new Date();
          
          const isTimeValid = now >= start && now <= end;
          const hasTargetZips = b.targetZipCodes && b.targetZipCodes.length > 0;
          const isZipValid = !hasTargetZips || (userZipBase && b.targetZipCodes?.includes(userZipBase));

          return isTimeValid && isZipValid;
        });
      setActiveBanners(valid);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % activeBanners.length), 6000);
    return () => clearInterval(timer);
  }, [activeBanners]);

  if (activeBanners.length === 0) return <div className={`w-full bg-[#0a2540] transition-all duration-300 ${isScrolled ? 'h-[238px]' : 'h-[280px] md:h-[350px]'}`} />;

  return (
    <div className={`relative w-full overflow-hidden bg-[#0a2540] transition-all duration-300 ease-in-out ${isScrolled ? 'h-[238px]' : 'h-[280px] md:h-[350px]'}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={activeBanners[currentIndex].id}
          src={activeBanners[currentIndex].imageUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "linear" }}
          className="absolute inset-0 w-full h-full object-cover"
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