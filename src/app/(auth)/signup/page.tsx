"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "react-hot-toast";
import { Loader2, MapPin, UserPlus } from "lucide-react";
import Link from "next/link";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      employeeId: "",
      department: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: data.name,
        email: data.email,
        employeeId: data.employeeId,
        department: data.department,
        role: "employee",
        createdAt: serverTimestamp(),
      });

      toast.success("Account created!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("DEBUG signup error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl text-sm";

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-32 left-16 h-64 w-64 rounded-full bg-indigo-400/30 blur-3xl float" />
          <div className="absolute bottom-24 right-16 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl float" style={{ animationDelay: "1.5s" }} />
        </div>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-14 animate-fade-in-left">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">GeoAttendance</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Join your team.<br />
            <span className="text-blue-200">Start tracking smarter.</span>
          </h1>
          <p className="text-base text-blue-100/80 max-w-sm leading-relaxed">
            Set up your account in seconds. Your employer will verify your details and assign your office location.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "GPS-verified check-in & check-out",
              "Real-time geofence validation",
              "Anti-spoofing protection",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100/90">
                <div className="h-2 w-2 rounded-full bg-blue-300" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg opacity-0 animate-fade-in-right">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-gradient">GeoAttendance</span>
          </div>

          <div className="space-y-1 mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
            <p className="text-muted-foreground text-sm">Fill in your details to get started</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground/70">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className={inputClasses} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground/70">Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" className={inputClasses} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-foreground/70">Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" className={inputClasses} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-foreground/70">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@company.com" className={inputClasses} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground/70">Password</FormLabel>
                      <FormControl>
                        <Input type="password" className={inputClasses} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-foreground/70">Confirm</FormLabel>
                      <FormControl>
                        <Input type="password" className={inputClasses} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl gradient-primary text-white font-semibold text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-5 w-5" />
                )}
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
