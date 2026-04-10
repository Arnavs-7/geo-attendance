"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Office Configuration
            </CardTitle>
            <CardDescription>Define the office location and geofence parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officeName">Office Name</Label>
              <Input id="officeName" {...register("officeName")} />
              {errors.officeName && <p className="text-xs text-red-500">{errors.officeName.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" type="number" step="any" {...register("latitude")} />
                {errors.latitude && <p className="text-xs text-red-500">{errors.latitude.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" type="number" step="any" {...register("longitude")} />
                {errors.longitude && <p className="text-xs text-red-500">{errors.longitude.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="radiusMeters">Radius (Meters)</Label>
                <Input id="radiusMeters" type="number" {...register("radiusMeters")} />
                {errors.radiusMeters && <p className="text-xs text-red-500">{errors.radiusMeters.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Rules
            </CardTitle>
            <CardDescription>Set the thresholds for late marking and check-outs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lateThresholdTime">Late Threshold (HH:MM)</Label>
                <Input id="lateThresholdTime" type="time" {...register("lateThresholdTime")} />
                <p className="text-xs text-muted-foreground">Employees marking attendance after this time will be flagged as &apos;Late&apos;.</p>
                {errors.lateThresholdTime && <p className="text-xs text-red-500">{errors.lateThresholdTime.message}</p>}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoCheckoutEnabled">Enable Auto Check-out</Label>
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
                    <Label htmlFor="autoCheckoutTime">Auto Check-out Time (HH:MM)</Label>
                    <Input id="autoCheckoutTime" type="time" {...register("autoCheckoutTime")} />
                    {errors.autoCheckoutTime && <p className="text-xs text-red-500">{errors.autoCheckoutTime.message}</p>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
             <Button type="submit" className="ml-auto" disabled={saving}>
               {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               Save Settings
             </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Geofence Tester */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Geofence Tester
          </CardTitle>
          <CardDescription>Verify if specific coordinates fall within your defined office boundary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Test Latitude</Label>
              <Input
                placeholder="e.g. 12.9716"
                value={testCoords.lat}
                onChange={(e) => setTestCoords({ ...testCoords, lat: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Test Longitude</Label>
              <Input
                placeholder="e.g. 77.5946"
                value={testCoords.lng}
                onChange={(e) => setTestCoords({ ...testCoords, lng: e.target.value })}
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleTestGeofence} className="w-full">
            Test Coordinates
          </Button>
          {testResult && (
            <div className={cn(
              "p-4 rounded-lg flex flex-col items-center justify-center gap-2 text-center",
              testResult.inside ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              <p className={cn("text-lg font-bold", testResult.inside ? "text-green-600" : "text-red-600")}>
                {testResult.inside ? "INSIDE BOUNDARY" : "OUTSIDE BOUNDARY"}
              </p>
              <p className="text-sm">Distance: {Math.round(testResult.distance)} meters from office center</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

