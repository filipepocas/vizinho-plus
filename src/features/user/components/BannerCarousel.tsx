import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../store/useStore';

const BannerCarousel: React.FC = () => {
  const { currentUser } = useStore();
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const userZipBase = currentUser.zipCode?.substring(0, 4);

    const q = query(collection(db, 'banners'), where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const now = new Date();
      const valid = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((b: any) => {
          // Verifica se está na data
          const start = b.startDate.toDate();
          const end = b.endDate.toDate();
          const isTimeValid = now >= start && now <= end;
          
          // Verifica Código Postal com operador de segurança
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

  if (activeBanners.length === 0) return null;

  return (
    <div className="relative w-full h-44 md:h-56 rounded-[40px] overflow-hidden border-4 border-[#0a2540] shadow-[10px_10px_0px_#00d66f] bg-[#0a2540] mb-8">
      <AnimatePresence mode="wait">
        <motion.img
          key={activeBanners[currentIndex].id}
          src={activeBanners[currentIndex].imageUrl}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "anticipate" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      {activeBanners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          {activeBanners.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-2 rounded-full transition-all duration-500 border-2 border-[#0a2540] ${
                idx === currentIndex ? 'w-8 bg-[#00d66f]' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;