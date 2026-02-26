import { supabase } from "../libs/supabase"
import type { RegisterInput } from "../types/RegisterInput"


/**
 * ============================
 * REGISTER USER
 * ============================
 */
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
  // 1️⃣ Validar disponibilidad usando RPC
  const { data: check, error: checkError } = await supabase
    .rpc("check_registration_availability", {
      p_id_card: input.idCard,
      p_rnc: input.companyRnc,
    })

  if (checkError) throw checkError
  if (!check?.available) throw new Error(check?.reason || "No disponible")

  // 2️⃣ Registrar usuario en Supabase Auth
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

  // 3️⃣ Validaciones adicionales
  if (data.user && data.user.identities?.length === 0) {
    throw new Error("Este correo ya está registrado")
  }


  if (!data.user) {
    throw new Error("No se pudo crear el usuario")
  }

  return data.user
}



/**
 * ============================
 * LOGIN USER
 * ============================
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw error
  if (!data.user) throw new Error("Credenciales inválidas")

  return data.user
}



/**
 * ============================
 * LOGOUT USER
 * ============================
 */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) throw error
}



/**
 * ============================
 * SEND PASSWORD RESET EMAIL
 * ============================
 */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/update-password`,
    }
  )

  if (error) throw error
}



/**
 * ============================
 * UPDATE PASSWORD
 * ============================
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}



/**
 * ============================
 * GET CURRENT USER
 * ============================
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data.user
}

  if (!data.user) throw new Error("No se pudo crear el usuario")
}
