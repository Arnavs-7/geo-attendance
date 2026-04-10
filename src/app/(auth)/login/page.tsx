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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  password: z.string().min(1, "Required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
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
      console.error("DEBUG full error obj:", JSON.stringify(error, null, 2));
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs font-medium text-primary hover:underline"
                        disabled={resetLoading}
                      >
                        {resetLoading ? "Sending..." : "Forgot password?"}
                      </button>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* ===== TEMPORARY VISUAL DEBUGGER — REMOVE BEFORE FINAL DEPLOY ===== */}
              <div className="rounded border border-dashed border-orange-400 bg-orange-50 p-3 text-xs font-mono space-y-1">
                <p className="font-bold text-orange-700">🔧 Firebase Env Debug (TEMP)</p>
                <p>API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ EXISTS' : '❌ MISSING'} — len: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length || 0}</p>
                <p>Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ EXISTS' : '❌ MISSING'} — len: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.length || 0}</p>
                <p>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ EXISTS' : '❌ MISSING'} — len: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.length || 0}</p>
                <p>Storage Bucket: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ EXISTS' : '❌ MISSING'} — len: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.length || 0}</p>
                <p>Messaging ID: {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ EXISTS' : '❌ MISSING'} — len: {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.length || 0}</p>
                <p>App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ EXISTS' : '❌ MISSING'} — len: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.length || 0}</p>
              </div>
              {/* ===== END DEBUGGER ===== */}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm">
          <div className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
