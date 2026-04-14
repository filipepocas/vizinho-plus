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

    const q = query(collection(db, 'banners'), where('active', '==', true));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const now = new Date();
      const valid = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((b: any) => {
          // X4 - Proteção contra Timestamps Provisórios do Firebase
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

  if (activeBanners.length === 0) return <div className="w-full h-64 bg-[#0a2540]" />;

  return (
    <div className="relative w-full h-[280px] md:h-[350px] overflow-hidden bg-[#0a2540]">
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/20 pointer-events-none" />
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