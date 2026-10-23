export const NAV_LINKS = [
  { href: "/inventory", key: "inventory" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export const DEALERSHIP = {
  name: "AutoLux",
  phone: "+7 727 555 01 48",
  phoneHref: "+77275550148",
  email: "concierge@autolux.example",
  mapsUrl: "https://maps.google.com/?q=Prestige+Avenue+12+Almaty",
  hours: [
    { key: "weekdays", time: "9:00 – 19:00" },
    { key: "saturday", time: "10:00 – 18:00" },
    { key: "sunday", time: "11:00 – 16:00" },
  ],
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "YouTube", href: "https://www.youtube.com/" },
  ],
};
