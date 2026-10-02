export function kenyaMpesaPhone(value: string): string {
  return kenyaPhoneParts(value).mpesa;
}

export function kenyaPhoneDisplay(value: string): string {
  return kenyaPhoneParts(value).display;
}

function kenyaPhoneParts(value: string): { display: string; mpesa: string } {
  const digits = value.replace(/\D/g, "");
  let national = "";
  if (digits.startsWith("254") && digits.length === 12) {
    national = `0${digits.slice(3)}`;
  } else if (digits.startsWith("0") && digits.length === 10) {
    national = digits;
  } else if (digits.length === 9 && digits.startsWith("7")) {
    national = `0${digits}`;
  }
  if (!/^07\d{8}$/.test(national)) {
    throw new Error("Enter a Kenyan M-PESA number starting with 07");
  }
  return { display: national, mpesa: `+254${national.slice(1)}` };
}
