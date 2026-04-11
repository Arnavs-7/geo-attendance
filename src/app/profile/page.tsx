"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, User, Mail, Shield, Building, Key, Save } from "lucide-react";
import Navbar from "@/components/shared/Navbar";

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [passUpdating, setPassUpdating] = useState(false);
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) return;
    setUpdating(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const department = formData.get("department") as string;

    try {
      await updateDoc(doc(db, "users", userProfile.uid), { name, department });
      toast.success("Profile updated!");
    } catch (error) {
      toast.error("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setPassUpdating(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, passwords.new);
        toast.success("Password updated successfully!");
        setPasswords({ new: "", confirm: "" });
      }
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please re-login to change your password.");
      } else {
        toast.error("Failed to update password.");
      }
    } finally {
      setPassUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const inputClasses = "h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl text-sm";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12 max-w-4xl">
        <div className="opacity-0 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your professional profile and security.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Summary */}
          <Card className="md:col-span-1 h-fit glass-card rounded-2xl opacity-0 animate-fade-in-delay">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mb-4 border border-primary/20">
                <User className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{userProfile?.name}</h3>
              <p className="text-xs uppercase tracking-wider font-bold text-primary mt-1">{userProfile?.role}</p>
              <div className="mt-6 space-y-3 text-left px-2">
                <div className="flex items-center gap-3 text-sm text-muted-foreground group">
                  <Mail className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                  <span className="truncate">{userProfile?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground group">
                  <Shield className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                  <span>ID: {userProfile?.employeeId}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground group">
                  <Building className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                  <span>{userProfile?.department}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Forms */}
          <div className="md:col-span-2 space-y-6 opacity-0 animate-fade-in-delay-2">
            <Card className="glass-card rounded-2xl border-white/[0.06]">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-1">Profile Information</h3>
                <p className="text-sm text-muted-foreground mb-6">Update your personal and department details.</p>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-medium text-foreground/70">Full Name</Label>
                    <Input id="name" name="name" defaultValue={userProfile?.name} required className={inputClasses} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-xs font-medium text-foreground/70">Department</Label>
                    <Input id="department" name="department" defaultValue={userProfile?.department} required className={inputClasses} />
                  </div>
                  <Button type="submit" disabled={updating} className="w-full sm:w-auto gradient-primary text-white rounded-xl h-11 px-8 hover:shadow-blue-500/30 hover:shadow-lg transition-all mt-2">
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl border-white/[0.06]">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-1">Security & Access</h3>
                <p className="text-sm text-muted-foreground mb-6">Change your account password to stay secure.</p>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-xs font-medium text-foreground/70">New Password</Label>
                      <Input 
                        id="newPassword" 
                        type="password" 
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        required 
                        className={inputClasses}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/70">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        required 
                        className={inputClasses}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="outline" disabled={passUpdating} className="w-full sm:w-auto rounded-xl h-11 px-8 border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-all mt-2">
                    {passUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Key className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
