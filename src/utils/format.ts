export const formatIdCard = (value: string) => {
  let clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length > 3) clean = `${clean.slice(0, 3)}-${clean.slice(3)}`;
  if (clean.length > 11) clean = `${clean.slice(0, 11)}-${clean.slice(11)}`;
  return clean;
};  

export const formatPhone = (value: string) => {
  let clean = value.replace(/\D/g, "").slice(0, 10);
  if (clean.length > 3) clean = `${clean.slice(0, 3)}-${clean.slice(3)}`;
  if (clean.length > 7) clean = `${clean.slice(0, 7)}-${clean.slice(7)}`;
  return clean;
};