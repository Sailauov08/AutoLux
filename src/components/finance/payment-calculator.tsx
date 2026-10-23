"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { calculateLoan } from "@/lib/finance";
import { formatPrice } from "@/lib/format";

const TERMS = [12, 24, 36, 48, 60, 72, 84];

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[11px] tracking-[0.24em] uppercase text-muted">
          {label}
        </label>
        <output htmlFor={id} className="text-xl font-medium tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ backgroundSize: `${fill}% 100%` }}
        className="mt-6 h-px w-full cursor-pointer appearance-none bg-[linear-gradient(var(--color-ink),var(--color-ink))] bg-no-repeat accent-ink [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-ink [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:bg-ink"
      />
    </div>
  );
}

export function PaymentCalculator({ defaultPrice = 60_000_000, applyHref = "/financing#apply" }: { defaultPrice?: number; applyHref?: string }) {
  const t = useTranslations("calculator");
  const [price, setPrice] = useState(defaultPrice);
  const [downPayment, setDownPayment] = useState(Math.round(defaultPrice * 0.2));
  const [apr, setApr] = useState(5.9);
  const [termMonths, setTermMonths] = useState(60);

  const down = Math.min(downPayment, price);
  const result = calculateLoan({ price, downPayment: down, apr, termMonths });
  const money = (value: number) => formatPrice(Math.round(value));

  return (
    <div className="grid grid-cols-1 border border-line lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-12 p-8 md:p-14">
        <Slider id="calc-price" label={t("price")} value={price} min={20_000_000} max={400_000_000} step={1_000_000} display={money(price)} onChange={setPrice} />
        <Slider id="calc-down" label={t("down")} value={down} min={0} max={price} step={500_000} display={money(down)} onChange={setDownPayment} />
        <Slider id="calc-apr" label={t("apr")} value={apr} min={0} max={12} step={0.1} display={`${apr.toFixed(1)}%`} onChange={setApr} />
        <div>
          <label htmlFor="calc-term" className="text-[11px] tracking-[0.24em] uppercase text-muted">
            {t("term")}
          </label>
          <select
            id="calc-term"
            value={termMonths}
            onChange={(event) => setTermMonths(Number(event.target.value))}
            className="mt-5 w-full border-0 border-b border-line bg-transparent py-3 text-xl text-ink outline-none focus:border-ink"
          >
            {TERMS.map((term) => (
              <option key={term} value={term}>
                {t("months", { count: term })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col bg-obsidian p-8 text-white md:p-14">
        <p className="text-[11px] tracking-[0.26em] uppercase text-champagne">{t("estimated")}</p>
        <p className="display mt-6 text-[clamp(2.4rem,4.2vw,4.75rem)] tabular-nums" aria-live="polite">
          {money(result.monthly)}
          <span className="text-base tracking-normal text-silver"> {t("perMonth")}</span>
        </p>

        <dl className="mt-12 divide-y divide-white/10 text-sm">
          {[
            [t("financed"), money(result.principal)],
            [t("interest"), money(result.totalInterest)],
            [t("total"), money(result.totalCost)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 py-4">
              <dt className="text-silver">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-auto pt-12 text-xs leading-[1.7] text-white/45">{t("disclaimer")}</p>
        <ButtonLink href={applyHref} variant="white" className="mt-8 w-full" arrow>
          {t("start")}
        </ButtonLink>
      </div>
    </div>
  );
}
