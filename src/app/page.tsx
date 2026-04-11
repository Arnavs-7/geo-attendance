"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Clock, MousePointer2, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />

      {/* Navigation */}
      <nav className="relative z-10 container flex h-20 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">GeoAttendance</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4">
            Sign In
          </Link>
          <Button asChild className="rounded-full px-6 gradient-primary shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:scale-105">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container pt-24 pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 text-xs font-semibold text-blue-400 animate-fade-in">
            <Shield className="h-3.5 w-3.5" />
            <span>ENTERPRISE-GRADE ATTENDANCE TRACKING</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight opacity-0 animate-fade-in-delay">
            The Smartest Way to <br />
            <span className="text-gradient">Track Attendance.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-delay-2">
            Automate your workforce tracking with real-time GPS verification, geofencing protection, and seamless report generation. 
            Reliable, secure, and built for modern teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 opacity-0 animate-fade-in-delay-3">
            <Button asChild size="lg" className="w-full sm:w-auto rounded-2xl px-10 h-16 text-lg font-bold gradient-primary shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl px-10 h-16 text-lg font-medium border-white/10 hover:bg-white/5 transition-all">
              <Link href="/login">Watch Demo</Link>
            </Button>
          </div>

          {/* Feature Grid Shortcut */}
          <div className="pt-24 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
            {[
              { 
                icon: MapPin, 
                title: "Geofencing", 
                desc: "Precise location-based check-ins ensure your team is exactly where they need to be." 
              },
              { 
                icon: Shield, 
                title: "Anti-Spoofing", 
                desc: "Advanced detection algorithms prevent fake GPS coordinates and clock-in manipulation." 
              },
              { 
                icon: Clock, 
                title: "Real-time sync", 
                desc: "Check-in data syncs instantly to the cloud, giving admins live visibility of their workforce." 
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 rounded-3xl text-left hover:border-blue-500/30 transition-all group">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                  <feature.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Mockup Preview (Visual only) */}
      <div className="pt-20 opacity-0 animate-fade-in" style={{ animationDelay: '1s' }}>
        <div className="container max-w-5xl mx-auto px-4">
          <div className="relative glass-card aspect-video rounded-3xl border-white/10 overflow-hidden shadow-2xl shadow-blue-500/10 transform rotate-1 hover:rotate-0 transition-transform duration-700">
             <div className="absolute inset-0 bg-blue-900/10" />
             <div className="absolute top-0 left-0 right-0 h-12 bg-white/5 border-b border-white/5 flex items-center px-6 gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/20" />
                <div className="h-3 w-3 rounded-full bg-amber-500/20" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/20" />
             </div>
             <div className="mt-20 px-12 space-y-8">
                <div className="h-8 w-1/3 bg-white/5 rounded-lg animate-pulse" />
                <div className="grid grid-cols-3 gap-6">
                  <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-white/5 rounded-2xl animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="h-32 bg-white/5 rounded-2xl animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <div className="h-40 bg-white/5 rounded-2xl animate-pulse" style={{ animationDelay: '0.6s' }} />
             </div>
          </div>
        </div>
      </div>

      <footer className="container py-12 text-center text-sm text-muted-foreground opacity-50">
        © 2024 GeoAttendance — Smart tracking for the modern workplace.
      </footer>
    </div>
  );
}
