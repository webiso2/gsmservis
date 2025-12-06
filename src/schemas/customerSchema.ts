import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, { message: "Müşteri adı zorunludur" }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz" }).optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
