import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMaskedToken(customerName?: string | null, customerPhone?: string | null): string {
  let namePart = "Cus";
  if (customerName) {
    const cleaned = customerName.replace(/[^a-zA-Z]/g, "");
    if (cleaned.length >= 3) {
      namePart = cleaned.slice(0, 3);
      namePart = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    } else if (cleaned.length > 0) {
      namePart = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
  }
  let phonePart = "";
  if (customerPhone) {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length >= 5) {
      phonePart = digits.slice(-5);
    } else if (digits.length > 0) {
      phonePart = digits;
    }
  }
  return phonePart ? `${namePart}-${phonePart}` : namePart;
}
