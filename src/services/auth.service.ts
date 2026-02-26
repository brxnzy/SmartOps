import { supabase } from "../libs/supabase"
import type { RegisterInput } from "../types/RegisterInput"

interface LoginInput {
  email: string
  password: string
}

export async function loginUser({ email, password }: LoginInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw error
  if (!data.user) throw new Error("No se pudo iniciar sesion.")

  return data.user
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function registerUser(input: RegisterInput) {

  const { data: check, error: checkError } = await supabase
    .rpc("check_registration_availability", {
      p_id_card: input.idCard,
      p_rnc: input.companyRnc,
    })

  if (checkError) throw checkError
  if (!check.available) throw new Error(check.reason)

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

  if (data.user && data.user.identities?.length === 0) {
    throw new Error("Este correo ya está registrado")
  }

  if (!data.user) throw new Error("No se pudo crear el usuario")
}
