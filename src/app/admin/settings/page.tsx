"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import { Loader2, Save, MapPin, Clock, ShieldCheck } from "lucide-react";
import { OfficeConfig } from "@/types";
import { haversineDistance } from "@/utils/geofence";
import { cn } from "@/lib/utils";

const settingsSchema = z.object({
  officeName: z.string().min(2, "Office name must be at least 2 characters"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(10).max(10000),
  lateThresholdTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  autoCheckoutEnabled: z.boolean(),
  autoCheckoutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCoords, setTestCoords] = useState({ lat: "", lng: "" });
  const [testResult, setTestResult] = useState<{ distance: number; inside: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const autoCheckoutEnabled = watch("autoCheckoutEnabled");

  useEffect(() => {
    const fetchConfig = async () => {
      const docSnap = await getDoc(doc(db, "officeConfig", "default"));
      if (docSnap.exists()) {
        reset(docSnap.data() as SettingsFormValues);
      }
      setLoading(false);
    };
    fetchConfig();
  }, [reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "officeConfig", "default"), { ...data });
      toast.success("Settings updated successfully!");
    } catch (error) {
      toast.error("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestGeofence = () => {
    const lat = parseFloat(testCoords.lat);
    const lng = parseFloat(testCoords.lng);
    const officeLat = watch("latitude");
    const officeLng = watch("longitude");
    const radius = watch("radiusMeters");

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid test coordinates.");
      return;
    }

    const distance = haversineDistance(lat, lng, officeLat, officeLng);
    setTestResult({
      distance,
      inside: distance <= radius,
    });
  };

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const inputClasses = "h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 rounded-xl text-sm";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight opacity-0 animate-fade-in">Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 opacity-0 animate-fade-in-delay">
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Office Configuration
            </CardTitle>
            <CardDescription>Define the office location and geofence parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officeName" className="text-xs font-medium text-foreground/70">Office Name</Label>
              <Input id="officeName" {...register("officeName")} className={inputClasses} />
              {errors.officeName && <p className="text-xs text-red-400">{errors.officeName.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-xs font-medium text-foreground/70">Latitude</Label>
                <Input id="latitude" type="number" step="any" {...register("latitude")} className={inputClasses} />
                {errors.latitude && <p className="text-xs text-red-400">{errors.latitude.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-xs font-medium text-foreground/70">Longitude</Label>
                <Input id="longitude" type="number" step="any" {...register("longitude")} className={inputClasses} />
                {errors.longitude && <p className="text-xs text-red-400">{errors.longitude.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="radiusMeters" className="text-xs font-medium text-foreground/70">Radius (Meters)</Label>
                <Input id="radiusMeters" type="number" {...register("radiusMeters")} className={inputClasses} />
                {errors.radiusMeters && <p className="text-xs text-red-400">{errors.radiusMeters.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Attendance Rules
            </CardTitle>
            <CardDescription>Set the thresholds for late marking and check-outs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lateThresholdTime" className="text-xs font-medium text-foreground/70">Late Threshold (HH:MM)</Label>
                <Input id="lateThresholdTime" type="time" {...register("lateThresholdTime")} className={inputClasses} />
                <p className="text-xs text-muted-foreground">Employees marking attendance after this time will be flagged as &apos;Late&apos;.</p>
                {errors.lateThresholdTime && <p className="text-xs text-red-400">{errors.lateThresholdTime.message}</p>}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between glass-card-light rounded-xl p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoCheckoutEnabled" className="text-sm font-medium">Enable Auto Check-out</Label>
                    <p className="text-xs text-muted-foreground">Automatically check-out employees at a set time.</p>
                  </div>
                  <Switch
                    id="autoCheckoutEnabled"
                    checked={autoCheckoutEnabled}
                    onCheckedChange={(checked) => setValue("autoCheckoutEnabled", checked)}
                  />
                </div>
                {autoCheckoutEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="autoCheckoutTime" className="text-xs font-medium text-foreground/70">Auto Check-out Time (HH:MM)</Label>
                    <Input id="autoCheckoutTime" type="time" {...register("autoCheckoutTime")} className={inputClasses} />
                    {errors.autoCheckoutTime && <p className="text-xs text-red-400">{errors.autoCheckoutTime.message}</p>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex justify-end">
            <Button type="submit" disabled={saving} className="gradient-primary text-white rounded-xl h-11 px-8 hover:shadow-blue-500/30 hover:shadow-lg transition-all">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        </Card>
      </form>

      {/* Geofence Tester */}
      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Geofence Tester
          </CardTitle>
          <CardDescription>Verify if specific coordinates fall within your defined office boundary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Test Latitude</Label>
              <Input
                placeholder="e.g. 12.9716"
                value={testCoords.lat}
                onChange={(e) => setTestCoords({ ...testCoords, lat: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/70">Test Longitude</Label>
              <Input
                placeholder="e.g. 77.5946"
                value={testCoords.lng}
                onChange={(e) => setTestCoords({ ...testCoords, lng: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleTestGeofence} className="w-full rounded-xl h-11 border-white/[0.1] hover:bg-white/[0.04] transition-all">
            Test Coordinates
          </Button>
          {testResult && (
            <div className={cn(
              "p-5 rounded-xl flex flex-col items-center justify-center gap-2 text-center border",
              testResult.inside ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
            )}>
              <p className={cn("text-lg font-bold", testResult.inside ? "text-emerald-400" : "text-red-400")}>
                {testResult.inside ? "INSIDE BOUNDARY" : "OUTSIDE BOUNDARY"}
              </p>
              <p className="text-sm text-muted-foreground">Distance: {Math.round(testResult.distance)} meters from office center</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
