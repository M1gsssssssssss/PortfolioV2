# Portfolio

A Next.js portfolio with public visitor access and an admin editor. Visitors can browse and
filter published projects. The configured GitHub account can edit the profile, add and edit
projects, and archive or restore projects.

## Configure Supabase and GitHub sign-in

1. In GitHub, create an OAuth App under **Settings → Developer settings → OAuth Apps**.
   Set the Homepage URL to your portfolio URL (use `http://localhost:3000` during local
   development). Set its Authorization callback URL to the callback URL shown in Supabase under
   **Authentication → Sign In / Providers → GitHub**.
2. In Supabase, enable the GitHub provider and enter the OAuth App's GitHub Client ID and
   Client Secret.
3. In Supabase **Authentication → URL Configuration**, set the Site URL and add your local and
   deployed portfolio URLs to the redirect URL allow list (for example,
   `http://localhost:3000`, `http://localhost:3000/auth/callback`, `https://your-domain.example`,
   and `https://your-domain.example/auth/callback`).
4. Copy `.env.example` to `.env.local`. Set the Supabase project URL, publishable anon key, and
   the exact email address of the GitHub account that will be the admin. The publishable key is
   intended for browser use; never put a Supabase service-role key in this app.
5. Open `supabase/schema.sql` in the Supabase SQL Editor. Set the email in the
   `public.is_portfolio_admin()` function to the same admin email used in `.env.local`, then run
   the **entire script**. This creates the `portfolio_content` table, access policies, the
   public portfolio image bucket with admin-only write policies, and the initial portfolio row.
   If Supabase displays an error, the script did not finish; fix the reported error and run the
   complete script again.
6. Start the app with `npm run dev` and use **Admin sign in**. Sign in to GitHub with the
   configured admin account to edit the portfolio. Other visitors can browse without signing in.

The app requests GitHub's `read:user` and `user:email` scopes so Supabase can identify the
admin by email, including when the GitHub email is private. The database enables row-level
security: everyone can read the portfolio, but only the GitHub account whose email is in the
SQL policy can insert or update it. Hiding editor controls in the UI is not the security
boundary; Supabase enforces write access independently.

The About section accepts JPG, PNG, and WebP portraits up to 5 MB. Uploading or changing the
portrait requires the configured admin account. If the database was already configured before
the image upload feature was added, run the updated `supabase/schema.sql` script in the SQL
Editor to create the image bucket and its access policies.

## Run locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
