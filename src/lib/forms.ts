export type FormErrors = Record<string, string>;

export const hasErrors = (errors: FormErrors) => Object.keys(errors).length > 0;

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isPhone = (value: string) => /^\+?[0-9\s()-]{7,20}$/.test(value.trim());

export const simulateRequest = () => new Promise<void>((resolve) => setTimeout(resolve, 900));
