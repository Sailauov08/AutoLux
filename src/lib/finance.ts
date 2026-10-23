export type LoanInput = {
  price: number;
  downPayment: number;
  apr: number;
  termMonths: number;
};

export function calculateLoan({ price, downPayment, apr, termMonths }: LoanInput) {
  const principal = Math.max(price - downPayment, 0);
  const rate = apr / 100 / 12;
  const monthly =
    principal === 0
      ? 0
      : rate === 0
        ? principal / termMonths
        : (principal * rate) / (1 - (1 + rate) ** -termMonths);
  const totalCost = monthly * termMonths + Math.min(downPayment, price);

  return {
    principal,
    monthly,
    totalInterest: Math.max(monthly * termMonths - principal, 0),
    totalCost,
  };
}
