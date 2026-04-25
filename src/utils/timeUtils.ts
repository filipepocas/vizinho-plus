// src/utils/timeUtils.ts

export const isOpenNow = (businessHours?: Record<string, { open: string; close: string; closed: boolean }>): boolean => {
  if (!businessHours) return true; 

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const today = days[now.getDay()];
  const todayHours = businessHours[today];

  if (!todayHours || todayHours.closed) return false;
  if (!todayHours.open || !todayHours.close) return true;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = todayHours.open.split(':').map(Number);
  const [closeH, closeM] = todayHours.close.split(':').map(Number);

  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime <= closeTime;
};

export const translateDay = (day: string): string => {
  const map: Record<string, string> = {
    monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo'
  };
  return map[day] || day;
};