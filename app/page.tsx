"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Assistant from "@/components/assistant";
import React from "react";

export default function Main() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header with title */}
      <header className="h-24 border-b border-gray-200 relative z-50 bg-white">
        <div className="container mx-auto h-full px-6">
          <div className="flex items-center justify-center h-full">
            <h1 className="text-2xl font-bold text-gray-900">BMSD Transportation Crisis Case Study</h1>
          </div>
        </div>
      </header>

      {/* Main content - fills available space */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="w-full">
          <Assistant />
        </div>
      </main>
    </div>
  );
}
