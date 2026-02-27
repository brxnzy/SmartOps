import { supabase } from "../libs/supabase"
import type { RegisterInput } from "../types/RegisterInput"
import { translateAuthError } from "../utils/authErrorMessages"

const REQUEST_TIMEOUT_MS = 12000

async function withTimeout<T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error("La solicitud tardo demasiado. Intenta de nuevo."))
      }, timeoutMs)
    }),
  ])
}

function mapAuthError(message: string) {
  return translateAuthError({ message }, message)
}

/**
 * ============================
 * REGISTER USER
 * ============================
 */
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

/**
 * Verifica el codigo OTP (6 digitos) enviado al correo.
 */
export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await withTimeout(
    supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    })
  )

  if (error) throw new Error(mapAuthError(error.message))

  return data
}

/**
 * Reenvia el codigo OTP al correo del usuario.
 */
export async function resendVerificationOtp(email: string) {
  const { error } = await withTimeout(
    supabase.auth.resend({
      type: "signup",
      email,
    })
  )

  if (error) throw new Error(mapAuthError(error.message))
}
