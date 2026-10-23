import type { VehicleStatus } from "./domain";

export type CarBadge = "Certified" | "Low Mileage" | "New Arrival" | "Rare";
export type PhotoSource = "dealer" | "representative" | "pending";

export type Car = {
  id: string;
  uuid?: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  horsepower: number;
  drivetrain: string;
  bodyType: string;
  color: string;
  engine: string;
  images: string[];
  badges: CarBadge[];
  featured?: boolean;
  status?: VehicleStatus;
  photoSource: PhotoSource;
};

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=75`;

export const CARS: Car[] = [
  {
    id: "mercedes-s-580",
    brand: "Mercedes-Benz",
    model: "S 580 4MATIC",
    year: 2024,
    price: 60000000,
    mileage: 6800,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 496,
    drivetrain: "AWD",
    bodyType: "Sedan",
    color: "Obsidian Black",
    engine: "3.0L Inline-6 Turbo Mild-Hybrid",
    images: [photo("photo-1610099610040-ab19f3a5ec35"), photo("photo-1661589997089-405a6076fc18")],
    photoSource: "representative",
    badges: ["Certified", "Low Mileage"],
    featured: true,
  },
  {
    id: "mercedes-amg-gt-63-s",
    brand: "Mercedes-Benz",
    model: "AMG GT 63 S 4-Door",
    year: 2023,
    price: 91000000,
    mileage: 5000,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 630,
    drivetrain: "AWD",
    bodyType: "Coupe",
    color: "Graphite Grey",
    engine: "4.0L Twin-Turbo V8",
    images: [photo("photo-1622551997608-400d763b0f64")],
    photoSource: "representative",
    badges: ["New Arrival"],
    featured: true,
  },
  {
    id: "mercedes-g-63-amg",
    brand: "Mercedes-Benz",
    model: "G 63 AMG",
    year: 2024,
    price: 105600000,
    mileage: 2900,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 577,
    drivetrain: "4WD",
    bodyType: "SUV",
    color: "Magno Graphite",
    engine: "4.0L Twin-Turbo V8",
    images: [photo("photo-1669428800842-5f1d3645cef2"), photo("photo-1648413653877-ade5eefd2f1b"), photo("photo-1648413653819-7c0fd93e8e6a")],
    photoSource: "representative",
    badges: ["Certified"],
  },
  {
    id: "porsche-911-carrera-s",
    brand: "Porsche",
    model: "911 Carrera S",
    year: 2024,
    price: 70000000,
    mileage: 8700,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 473,
    drivetrain: "RWD",
    bodyType: "Coupe",
    color: "GT Silver Metallic",
    engine: "3.0L Twin-Turbo Flat-6",
    images: [photo("photo-1768066522148-2a9d0df56803"), photo("photo-1768066522415-8dd2aa4a7510"), photo("photo-1768066522478-aebf2eaf6fe9")],
    photoSource: "representative",
    badges: ["Certified", "Low Mileage"],
    featured: true,
  },
  {
    id: "porsche-911-carrera-4-cabriolet",
    brand: "Porsche",
    model: "911 Carrera 4 Cabriolet",
    year: 2023,
    price: 75800000,
    mileage: 12700,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 379,
    drivetrain: "AWD",
    bodyType: "Convertible",
    color: "Black",
    engine: "3.0L Twin-Turbo Flat-6",
    images: [photo("photo-1659611807210-917ac61ff451")],
    photoSource: "representative",
    badges: ["Certified"],
  },
  {
    id: "porsche-718-cayman-gt4",
    brand: "Porsche",
    model: "718 Cayman GT4",
    year: 2023,
    price: 67200000,
    mileage: 10000,
    fuel: "Gasoline",
    transmission: "Manual",
    horsepower: 414,
    drivetrain: "RWD",
    bodyType: "Coupe",
    color: "Shark Blue",
    engine: "4.0L Naturally Aspirated Flat-6",
    images: [photo("photo-1706397094761-c91b1d785bed"), photo("photo-1699325413806-48286e94351c"), photo("photo-1706744888100-d546f8bfac2a")],
    photoSource: "representative",
    badges: ["Low Mileage"],
  },
  {
    id: "porsche-taycan-turbo-s",
    brand: "Porsche",
    model: "Taycan Turbo S",
    year: 2024,
    price: 97600000,
    mileage: 4200,
    fuel: "Electric",
    transmission: "Automatic",
    horsepower: 750,
    drivetrain: "AWD",
    bodyType: "Sedan",
    color: "Carrara White",
    engine: "Dual-Motor 93.4 kWh",
    images: [photo("photo-1642911041553-297e5295276b"), photo("photo-1611157816410-6a6b31ee255e"), photo("photo-1633080413628-455cad8b6547")],
    photoSource: "representative",
    badges: ["New Arrival"],
  },
  {
    id: "bmw-m5-competition",
    brand: "BMW",
    model: "M5 Competition",
    year: 2024,
    price: 65700000,
    mileage: 7700,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 617,
    drivetrain: "AWD",
    bodyType: "Sedan",
    color: "Frozen Dark Grey",
    engine: "4.4L Twin-Turbo V8",
    images: [photo("photo-1603189617530-6d32306f57c5"), photo("photo-1603189661342-e45f1374f890")],
    photoSource: "representative",
    badges: ["Certified"],
  },
  {
    id: "bmw-i7-xdrive60",
    brand: "BMW",
    model: "i7 xDrive60",
    year: 2024,
    price: 62200000,
    mileage: 3200,
    fuel: "Electric",
    transmission: "Automatic",
    horsepower: 536,
    drivetrain: "AWD",
    bodyType: "Sedan",
    color: "Carbon Black",
    engine: "Dual-Motor 101.7 kWh",
    images: [photo("photo-1788178243376-7df65939eb55"), photo("photo-1739545884078-9cb18fd7fa33")],
    photoSource: "representative",
    badges: ["New Arrival", "Low Mileage"],
  },
  {
    id: "audi-rs-e-tron-gt",
    brand: "Audi",
    model: "RS e-tron GT",
    year: 2023,
    price: 68200000,
    mileage: 15000,
    fuel: "Electric",
    transmission: "Automatic",
    horsepower: 637,
    drivetrain: "AWD",
    bodyType: "GT",
    color: "Ultra Blue",
    engine: "Dual-Motor 93.4 kWh",
    images: [photo("photo-1624000787556-1b9e28bbcd03"), photo("photo-1615222874898-37089fcf47ee"), photo("photo-1655126275641-21e114342284")],
    photoSource: "representative",
    badges: ["Certified"],
  },
  {
    id: "range-rover-autobiography",
    brand: "Range Rover",
    model: "Autobiography LWB",
    year: 2024,
    price: 90700000,
    mileage: 5500,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 523,
    drivetrain: "AWD",
    bodyType: "SUV",
    color: "Santorini Black",
    engine: "4.4L Twin-Turbo V8",
    images: [photo("photo-1652741938599-42b4aa7f1259"), photo("photo-1767274592417-c986b7619c8c")],
    photoSource: "representative",
    badges: ["Certified", "Low Mileage"],
  },
  {
    id: "lexus-ls-500h",
    brand: "Lexus",
    model: "LS 500h F Sport",
    year: 2023,
    price: 47300000,
    mileage: 19300,
    fuel: "Hybrid",
    transmission: "Automatic",
    horsepower: 359,
    drivetrain: "RWD",
    bodyType: "Sedan",
    color: "Ultrasonic Blue",
    engine: "3.5L V6 Hybrid",
    images: [],
    photoSource: "pending",
    badges: ["Low Mileage"],
  },
  {
    id: "tesla-model-s-plaid",
    brand: "Tesla",
    model: "Model S Plaid",
    year: 2024,
    price: 53800000,
    mileage: 9700,
    fuel: "Electric",
    transmission: "Automatic",
    horsepower: 1020,
    drivetrain: "AWD",
    bodyType: "Sedan",
    color: "Pearl White",
    engine: "Tri-Motor 100 kWh",
    images: [photo("photo-1648786388920-0d1f9f69d8b9"), photo("photo-1648786389979-5c84d978397d"), photo("photo-1648786390030-836b0dca7381")],
    photoSource: "representative",
    badges: ["New Arrival"],
  },
  {
    id: "ferrari-roma",
    brand: "Ferrari",
    model: "Roma",
    year: 2023,
    price: 138700000,
    mileage: 3700,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 612,
    drivetrain: "RWD",
    bodyType: "Coupe",
    color: "Rosso Corsa",
    engine: "3.9L Twin-Turbo V8",
    images: [photo("photo-1666790995628-9b55f65cdeeb"), photo("photo-1600858886605-78428bb6e236"), photo("photo-1687599891000-cf8af5ae4386")],
    photoSource: "representative",
    badges: ["Certified", "Rare"],
  },
  {
    id: "lamborghini-huracan-evo",
    brand: "Lamborghini",
    model: "Huracán EVO",
    year: 2022,
    price: 127200000,
    mileage: 6600,
    fuel: "Gasoline",
    transmission: "Automatic",
    horsepower: 631,
    drivetrain: "AWD",
    bodyType: "Coupe",
    color: "Giallo Inti",
    engine: "5.2L Naturally Aspirated V10",
    images: [photo("photo-1621285849733-39974b5d7497"), photo("photo-1621285960899-ba033aeca203"), photo("photo-1672717900266-3716749b3e50")],
    photoSource: "representative",
    badges: ["Rare"],
  },
];

export const VEHICLE_PLACEHOLDER = "/vehicle-placeholder.svg";

export const coverImage = (car: Pick<Car, "images">) => car.images[0] ?? VEHICLE_PLACEHOLDER;

export const galleryImages = (car: Pick<Car, "images">) => (car.images.length ? car.images : [VEHICLE_PLACEHOLDER]);

export const photoNoteKey = (car: Pick<Car, "photoSource">) =>
  car.photoSource === "representative" ? "photoRepresentative" : car.photoSource === "pending" ? "photoPending" : null;

export function getSimilarCars(car: Car, list: Car[], limit = 3) {
  return list.filter((item) => item.id !== car.id)
    .map((item) => ({
      item,
      score: (item.bodyType === car.bodyType ? 2 : 0) + (item.brand === car.brand ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || Math.abs(a.item.price - car.price) - Math.abs(b.item.price - car.price))
    .slice(0, limit)
    .map(({ item }) => item);
}
