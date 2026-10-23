import type { Car } from "./cars";

export type SortKey = "featured" | "price-asc" | "price-desc" | "year-desc" | "mileage-asc";

export type Filters = {
  query: string;
  brand: string;
  model: string;
  price: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  bodyType: string;
};

export const EMPTY_FILTERS: Filters = {
  query: "",
  brand: "",
  model: "",
  price: "",
  year: "",
  mileage: "",
  fuel: "",
  transmission: "",
  bodyType: "",
};

export const PRICE_RANGES = [
  { min: 0, max: 50_000_000 },
  { min: 50_000_000, max: 75_000_000 },
  { min: 75_000_000, max: 100_000_000 },
  { min: 100_000_000, max: Infinity },
];

export const MILEAGE_LIMITS = [{ max: 5_000 }, { max: 10_000 }, { max: 20_000 }];

export const SORT_OPTIONS: SortKey[] = ["featured", "price-asc", "price-desc", "year-desc", "mileage-asc"];

export function filterCars(cars: Car[], filters: Filters) {
  const query = filters.query.trim().toLowerCase();
  const price = filters.price === "" ? null : PRICE_RANGES[Number(filters.price)];
  const mileage = filters.mileage === "" ? null : MILEAGE_LIMITS[Number(filters.mileage)];

  return cars.filter(
    (car) =>
      (!query || `${car.brand} ${car.model} ${car.color} ${car.bodyType}`.toLowerCase().includes(query)) &&
      (!filters.brand || car.brand === filters.brand) &&
      (!filters.model || car.model === filters.model) &&
      (!price || (car.price >= price.min && car.price < price.max)) &&
      (!filters.year || car.year >= Number(filters.year)) &&
      (!mileage || car.mileage < mileage.max) &&
      (!filters.fuel || car.fuel === filters.fuel) &&
      (!filters.transmission || car.transmission === filters.transmission) &&
      (!filters.bodyType || car.bodyType === filters.bodyType),
  );
}

export function sortCars(cars: Car[], sort: SortKey) {
  const list = [...cars];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "year-desc":
      return list.sort((a, b) => b.year - a.year);
    case "mileage-asc":
      return list.sort((a, b) => a.mileage - b.mileage);
    default:
      return list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }
}
