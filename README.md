# Punto de Oro · Torneos de pádel

Aplicación web para organizar torneos de pádel: inscripción de parejas, fase de zonas
(grupos) con tabla de posiciones, y cuadro eliminatorio automático hasta la final.

## Qué hace

- **Jugadores:** crean su cuenta, inscriben su pareja en una categoría y ven el estado de su inscripción.
- **Organizadores:** crean torneos con varias categorías, confirman o rechazan parejas, marcan cabezas de serie,
  sortean las zonas, cargan horarios, canchas y resultados (por sets o W.O.) y generan el cuadro eliminatorio.
- **Público:** página de cada torneo con zonas, tablas y cuadro actualizados.
- La **primera cuenta** que se crea en el sitio es la administradora. Desde *Panel → Usuarios* se puede convertir
  a otras personas en organizadoras.

## Publicarla en internet (gratis), paso a paso

Necesitás 3 cuentas gratuitas: **GitHub** (guarda el código), **Neon** (base de datos) y **Vercel** (publica la web).

### 1. Base de datos en Neon
1. Entrá a https://neon.tech y creá una cuenta (podés usar "Continue with GitHub").
2. Creá un proyecto (nombre: `punto-de-oro`, región: la más cercana, p. ej. *AWS São Paulo*).
3. En el panel, tocá **Connect** y copiá la *connection string* (empieza con `postgresql://...`). Guardala.

### 2. Código en GitHub
1. Creá una cuenta en https://github.com.
2. Creá un repositorio nuevo llamado `punto-de-oro` (privado está bien), **vacío**.
3. Subí el código a ese repositorio (Claude puede hacerlo por vos si conectás el repositorio a la sesión).

### 3. Publicar en Vercel
1. Entrá a https://vercel.com y creá una cuenta con **Continue with GitHub**.
2. **Add New → Project** → elegí el repositorio `punto-de-oro` → **Import**.
3. En **Environment Variables** agregá dos:
   - `DATABASE_URL` = la connection string de Neon.
   - `AUTH_SECRET` = una frase larga e inventada (mínimo 32 caracteres), p. ej. `mi-club-de-padel-2026-clave-super-secreta-xyz`.
4. Tocá **Deploy** y esperá 2–3 minutos. Vercel te da una dirección tipo `punto-de-oro.vercel.app`.
5. Abrí esa dirección y **creá tu cuenta primero**: será la cuenta administradora.

> Dominio propio (opcional): en Vercel → *Settings → Domains* podés conectar uno como `www.tuclub.com`.

## Para programadores

```bash
npm install
cp .env.example .env   # completar DATABASE_URL y AUTH_SECRET
npx prisma db push
npm run dev
```

Stack: Next.js 15 (App Router, Server Actions), Prisma + PostgreSQL, Tailwind CSS 4.
La lógica del torneo (validación de sets, tablas, sorteo de zonas, armado del cuadro) está en `src/lib/padel.ts`.
