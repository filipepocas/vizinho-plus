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

    const q = query(collection(db, 'banners'), where('active', '==', true));

    const unsubscribe = onSnapshot(q, (snap: any) => {
      const now = new Date();
      const allBanners = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      console.log('🔍 Banners recebidos:', allBanners.length, allBanners);

      const valid = allBanners.filter((b: any) => {
        // Validação segura de datas
        let start = new Date(0);
        let end = new Date(8640000000000000);
        try {
          if (b.startDate) {
            start = typeof b.startDate.toDate === 'function' ? b.startDate.toDate() : new Date(b.startDate);
          }
          if (b.endDate) {
            end = typeof b.endDate.toDate === 'function' ? b.endDate.toDate() : new Date(b.endDate);
          }
        } catch (e) {
          console.warn('Erro ao converter datas do banner', b.id, e);
        }
        const isTimeValid = now >= start && now <= end;

        // Validação segura das zonas (targetZones pode ser undefined, null, array, etc.)
        const zones = Array.isArray(b.targetZones) ? b.targetZones : [];
        const hasTargetZones = zones.length > 0;
        let isZoneValid = true;
        if (hasTargetZones) {
          isZoneValid = zones.some((zone: string) => {
            const userDistrito = currentUser.distrito || '';
            const userConcelho = currentUser.concelho || '';
            const userFreguesia = currentUser.freguesia || '';

            if (zone.includes('Freguesia:')) {
              const nome = zone.split('Freguesia:')[1]?.split('(')[0]?.trim();
              return nome === userFreguesia;
            } else if (zone.includes('Concelho:')) {
              const nome = zone.split('Concelho:')[1]?.split('(')[0]?.trim();
              return nome === userConcelho;
            } else if (zone.includes('Distrito:')) {
              const nome = zone.split('Distrito:')[1]?.trim();
              return nome === userDistrito;
            }
            return false;
          });
        }

        return isTimeValid && isZoneValid;
      });

      console.log('✅ Banners válidos:', valid.length, valid);
      setActiveBanners(valid);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % activeBanners.length), 6000);
    return () => clearInterval(timer);
  }, [activeBanners]);

  if (activeBanners.length === 0) return <div className={`w-full bg-[#0a2540] transition-all duration-300 ${isScrolled ? 'h-[238px]' : 'h-[280px] md:h-[400px]'}`} />;

  return (
    <div className={`relative w-full overflow-hidden bg-[#0a2540] transition-all duration-300 ease-in-out ${isScrolled ? 'h-[238px]' : 'h-[280px] md:h-[400px]'}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={activeBanners[currentIndex].id}
          src={activeBanners[currentIndex].imageUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "linear" }}
          className="absolute inset-0 w-full h-full object-cover md:object-contain"
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