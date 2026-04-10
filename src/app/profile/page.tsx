"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { updatePassword, updateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, User, Mail, Shield, Building, Key } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <main className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Summary */}
          <Card className="md:col-span-1 h-fit">
            <CardHeader className="text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>{userProfile?.name}</CardTitle>
              <CardDescription className="uppercase tracking-wider font-bold text-xs">{userProfile?.role}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{userProfile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>ID: {userProfile?.employeeId}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{userProfile?.department}</span>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Forms */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" defaultValue={userProfile?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" name="department" defaultValue={userProfile?.department} required />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button type="submit" disabled={updating}>
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Change your account password.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required 
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button type="submit" variant="outline" disabled={passUpdating}>
                    {passUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Key className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
