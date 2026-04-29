import type { Metadata } from "next";

// Defense-in-depth: even though the /admin page itself returns a real 404
// when NEXT_PUBLIC_ADMIN_ENABLED is not "true", we also tell every crawler
// to skip indexing this route entirely. If the env gate is ever flipped on
// in production by mistake, the page still won't show up on Google or in
// Twitter previews.
export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
