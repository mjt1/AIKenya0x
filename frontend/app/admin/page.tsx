"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/spinner";

/** /admin lands on the knowledge base (the primary admin task). */
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/knowledge");
  }, [router]);
  return <FullScreenLoader label="Opening admin…" />;
}
