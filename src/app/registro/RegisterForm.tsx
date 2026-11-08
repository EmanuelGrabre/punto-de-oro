"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="name">Nombre y apellido</label>
        <input id="name" name="name" required autoComplete="name" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Teléfono / WhatsApp <span className="font-normal text-slate-400">(opcional)</span></label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input" />
        <p className="mt-1 text-xs text-slate-500">Mínimo 6 caracteres.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Creando…">Crear cuenta</SubmitButton>
    </form>
  );
}
