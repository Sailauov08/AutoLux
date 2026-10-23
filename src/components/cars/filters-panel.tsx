"use client";

import { useTranslations } from "next-intl";
import type { Car } from "@/lib/cars";
import { type Filters, MILEAGE_LIMITS, PRICE_RANGES } from "@/lib/inventory";
import { SelectField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Props = {
  cars: Car[];
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
};

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

export function FiltersPanel({ cars, filters, onChange, onReset }: Props) {
  const t = useTranslations("filters");
  const tEnum = useTranslations("enums");

  const brands = unique(cars.map((car) => car.brand));
  const models = unique(cars.filter((car) => !filters.brand || car.brand === filters.brand).map((car) => car.model));
  const years = unique(cars.map((car) => String(car.year))).sort((a, b) => Number(b) - Number(a));
  const fuels = unique(cars.map((car) => car.fuel));
  const transmissions = unique(cars.map((car) => car.transmission));
  const bodyTypes = unique(cars.map((car) => car.bodyType));

  const selectProps = (key: keyof Filters) => ({
    value: filters[key],
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(key, event.target.value),
  });

  return (
    <div className="space-y-7">
      <SelectField id="filter-brand" label={t("brand")} {...selectProps("brand")}>
        <option value="">{t("allBrands")}</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-model" label={t("model")} {...selectProps("model")} disabled={!filters.brand && models.length === 0}>
        <option value="">{t("allModels")}</option>
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-price" label={t("price")} {...selectProps("price")}>
        <option value="">{t("anyPrice")}</option>
        {PRICE_RANGES.map((_, index) => (
          <option key={index} value={index}>
            {t(`priceRange${index}`)}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-year" label={t("year")} {...selectProps("year")}>
        <option value="">{t("anyYear")}</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {t("yearAndNewer", { year })}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-mileage" label={t("mileage")} {...selectProps("mileage")}>
        <option value="">{t("anyMileage")}</option>
        {MILEAGE_LIMITS.map((_, index) => (
          <option key={index} value={index}>
            {t(`mileageLimit${index}`)}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-fuel" label={t("fuel")} {...selectProps("fuel")}>
        <option value="">{t("anyFuel")}</option>
        {fuels.map((fuel) => (
          <option key={fuel} value={fuel}>
            {tEnum(`fuel.${fuel}`)}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-transmission" label={t("transmission")} {...selectProps("transmission")}>
        <option value="">{t("anyTransmission")}</option>
        {transmissions.map((item) => (
          <option key={item} value={item}>
            {tEnum(`transmission.${item}`)}
          </option>
        ))}
      </SelectField>

      <SelectField id="filter-body" label={t("bodyType")} {...selectProps("bodyType")}>
        <option value="">{t("anyBodyType")}</option>
        {bodyTypes.map((type) => (
          <option key={type} value={type}>
            {tEnum(`bodyType.${type}`)}
          </option>
        ))}
      </SelectField>

      <Button variant="outline" onClick={onReset} className="w-full">
        {t("reset")}
      </Button>
    </div>
  );
}
