import { supabase } from "../libs/supabase"
import type { RegisterInput } from "../types/RegisterInput"


export async function registerUser(input: RegisterInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        name: input.name,
        idCard: input.idCard,
        company_name: input.companyName,
        company_address: input.companyAddress,
        company_phone: input.companyPhone,
        company_rnc: input.companyRnc,
      }
    }
  })

  if (error) throw error
  if (!data.user) throw new Error("No se pudo crear el usuario")
}