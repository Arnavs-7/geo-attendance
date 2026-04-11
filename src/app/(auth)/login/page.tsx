"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "react-hot-toast";
import { Loader2, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast.success("Logged in successfully!");
      router.push("/");
    } catch (error: any) {
      console.error("DEBUG login error:", error);
      let message = "Failed to login. Please check your credentials.";
      if (error.code === "auth/user-not-found") message = "User not found.";
      if (error.code === "auth/wrong-password") message = "Wrong password.";
      if (error.code === "auth/too-many-requests") message = "Too many attempts. Try again later.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email");
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error("Please enter a valid email address first.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error("Failed to send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-800 to-indigo-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl float" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl float" style={{ animationDelay: "1.5s" }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 animate-fade-in-left">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">GeoAttendance</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Smart Attendance,<br />
            <span className="text-blue-200">Verified by Location.</span>
          </h1>
          <p className="text-lg text-blue-100/80 max-w-md leading-relaxed">
            Enterprise-grade geofence-powered attendance tracking with real-time GPS verification and anti-spoofing protection.
          </p>
          <div className="mt-12 flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-sm text-blue-200/70 mt-1">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">&lt;2s</div>
              <div className="text-sm text-blue-200/70 mt-1">Check-in Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-sm text-blue-200/70 mt-1">Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md opacity-0 animate-fade-in-right">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-gradient">GeoAttendance</span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground/80">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@company.com"
                        className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium text-foreground/80">Password</FormLabel>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        disabled={resetLoading}
                      >
                        {resetLoading ? "Sending..." : "Forgot password?"}
                      </button>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-xl gradient-primary text-white font-semibold text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-5 w-5" />
                )}
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center">
            <span className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Create account
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
