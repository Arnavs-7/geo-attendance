"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
  GeoPoint,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistance, checkSpoofing } from "@/utils/geofence";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, MapPin, CheckCircle2, Clock, AlertTriangle,
  Navigation, Shield, Wifi, RefreshCw, MapPinOff,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "react-hot-toast";
import { AttendanceRecord, OfficeConfig } from "@/types";
import { computeStatus, localDateString } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { userProfile } = useAuth();
  const { coords, error: geoError, errorCode, loading: geoLoading, refetch } = useGeolocation();

  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, late: 0, percentage: 0 });

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setDataLoading(true);
    try {
      const today = localDateString();

      const [officeSnap, todaySnap, recentSnap] = await Promise.all([
        getDoc(doc(db, "officeConfig", "default")),
        getDocs(
          query(
            collection(db, "attendance"),
            where("userId", "==", userProfile.uid),
            where("date", "==", today)
          )
        ),
        getDocs(
          query(
            collection(db, "attendance"),
            where("userId", "==", userProfile.uid),
            orderBy("checkInTime", "desc"),
            limit(30)
          )
        ),
      ]);

      if (officeSnap.exists()) setOfficeConfig(officeSnap.data() as OfficeConfig);

      const firstToday = todaySnap.docs[0];
      setTodayAttendance(
        firstToday ? ({ id: firstToday.id, ...firstToday.data() } as AttendanceRecord) : null
      );

      const records = recentSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AttendanceRecord)
      );
      setRecentAttendance(records);

      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const monthRecords = records.filter((r) => {
        const d = r.checkInTime.toDate();
        return d >= start && d <= end;
      });
      const present = monthRecords.filter((r) => r.status === "present").length;
      const late = monthRecords.filter((r) => r.status === "late").length;
      const percentage = Math.min(
        100,
        Math.round(((present + late) / 22) * 100)
      );
      setStats({ present, late, percentage });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load your attendance data.");
    } finally {
      setDataLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const distance =
    coords && officeConfig
      ? haversineDistance(
          coords.latitude,
          coords.longitude,
          officeConfig.latitude,
          officeConfig.longitude
        )
      : null;

  const isInsideRadius =
    distance !== null && officeConfig !== null && distance <= officeConfig.radiusMeters;
  const isAccuracyLow = coords !== null && coords.accuracy > 50;
  const isAccuracyBlocked = coords !== null && coords.accuracy > 200;

  const handleMarkAttendance = async () => {
    if (!coords || !officeConfig || !userProfile || distance === null) return;

    if (isAccuracyBlocked) {
      toast.error("GPS accuracy is too low. Please move to an open area.");
      return;
    }
    if (isAccuracyLow) {
      toast("GPS accuracy is low — recording with a warning.", { icon: "⚠️" });
    }

    setMarkingLoading(true);
    try {
      const spoofCheck = checkSpoofing(coords.latitude, coords.longitude, Date.now());
      const today = localDateString();
      const status = computeStatus(new Date(), officeConfig.lateThresholdTime);

      const attendanceData = {
        userId: userProfile.uid,
        userName: userProfile.name,
        employeeId: userProfile.employeeId,
        date: today,
        checkInTime: serverTimestamp(),
        checkOutTime: null,
        lastActionAt: serverTimestamp(),
        checkInLocation: new GeoPoint(coords.latitude, coords.longitude),
        checkOutLocation: null,
        status,
        distanceFromOffice: Math.round(distance),
        gpsAccuracy: Math.round(coords.accuracy),
        deviceInfo: navigator.userAgent,
        isSuspicious: spoofCheck.isSuspicious,
        suspiciousReason: spoofCheck.reason,
      };

      await setDoc(doc(db, "attendance", `${userProfile.uid}_${today}`), attendanceData);
      toast.success(`Checked in as ${status.toUpperCase()}`);
      await fetchData();
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error(
        "Failed to check in. If this continues, contact your administrator."
      );
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance || !coords || !userProfile) return;
    setMarkingLoading(true);
    try {
      const docId = `${userProfile.uid}_${localDateString()}`;
      await updateDoc(doc(db, "attendance", docId), {
        checkOutTime: serverTimestamp(),
        checkOutLocation: new GeoPoint(coords.latitude, coords.longitude),
        lastActionAt: serverTimestamp(),
      });
      toast.success("Checked out successfully!");
      await fetchData();
    } catch (error) {
      console.error("Check-out error:", error);
      toast.error("Failed to check out. Please try again.");
    } finally {
      setMarkingLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Good {greeting},{" "}
          <span className="text-gradient">{userProfile?.name?.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 opacity-0 animate-fade-in-delay">
        {[
          { label: "Present", value: stats.present, icon: CheckCircle2, color: "emerald", gradient: "from-emerald-500/20 to-emerald-500/5" },
          { label: "Late", value: stats.late, icon: Clock, color: "amber", gradient: "from-amber-500/20 to-amber-500/5" },
          { label: "Attendance", value: `${stats.percentage}%`, icon: Shield, color: "blue", gradient: "from-blue-500/20 to-blue-500/5" },
          { label: "Radius", value: officeConfig ? `${officeConfig.radiusMeters}m` : "—", icon: Navigation, color: "violet", gradient: "from-violet-500/20 to-violet-500/5" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", stat.gradient)}>
                <stat.icon className={cn("h-5 w-5", {
                  "text-emerald-400": stat.color === "emerald",
                  "text-amber-400": stat.color === "amber",
                  "text-blue-400": stat.color === "blue",
                  "text-violet-400": stat.color === "violet",
                })} />
              </div>
              {dataLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label} this month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main action + location */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 opacity-0 animate-fade-in-delay-2">
        {/* Mark attendance */}
        <Card className="lg:col-span-3 glass-card rounded-2xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="mb-6">
              {dataLoading ? (
                <Skeleton className="h-8 w-28 rounded-full" />
              ) : todayAttendance ? (
                <Badge className={cn(
                  "px-5 py-1.5 text-sm font-semibold border-none rounded-full",
                  todayAttendance.checkOutTime
                    ? "bg-blue-500/20 text-blue-300"
                    : todayAttendance.status === "present"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                )}>
                  {todayAttendance.checkOutTime
                    ? "CHECKED OUT"
                    : `CHECKED IN · ${todayAttendance.status.toUpperCase()}`}
                </Badge>
              ) : (
                <Badge className="px-5 py-1.5 text-sm font-semibold bg-white/[0.06] text-muted-foreground border-none rounded-full">
                  NOT YET CHECKED IN
                </Badge>
              )}
            </div>

            {!dataLoading && todayAttendance ? (
              <div className="space-y-1 mb-6">
                <p className="text-sm text-muted-foreground">
                  Checked in at{" "}
                  <span className="text-foreground font-semibold">
                    {format(todayAttendance.checkInTime.toDate(), "hh:mm a")}
                  </span>
                </p>
                {todayAttendance.checkOutTime && (
                  <p className="text-sm text-muted-foreground">
                    Checked out at{" "}
                    <span className="text-foreground font-semibold">
                      {format(todayAttendance.checkOutTime.toDate(), "hh:mm a")}
                    </span>
                  </p>
                )}
              </div>
            ) : !dataLoading ? (
              <p className="text-sm text-muted-foreground mb-6">
                You haven&apos;t checked in today.
              </p>
            ) : null}

            {/* Action */}
            {dataLoading ? (
              <Skeleton className="h-32 w-32 rounded-full" />
            ) : !todayAttendance ? (
              <button
                className={cn(
                  "relative h-32 w-32 rounded-full font-bold text-lg transition-all duration-300",
                  isInsideRadius && !isAccuracyBlocked
                    ? "gradient-primary text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 animate-glow-pulse pulse-ring"
                    : "bg-white/[0.06] text-muted-foreground cursor-not-allowed border border-white/[0.08]"
                )}
                disabled={Boolean(!isInsideRadius || markingLoading || isAccuracyBlocked || !coords)}
                onClick={handleMarkAttendance}
              >
                {markingLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <MapPin className="h-7 w-7" />
                    <span className="text-sm">Check In</span>
                  </div>
                )}
              </button>
            ) : !todayAttendance.checkOutTime ? (
              <Button
                variant="outline"
                className="h-14 px-10 rounded-2xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-base font-semibold"
                disabled={markingLoading || !coords}
                onClick={handleCheckOut}
              >
                {markingLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Check Out
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">All done for today</span>
              </div>
            )}

            {!dataLoading && !todayAttendance && !isInsideRadius && !geoError && coords && (
              <p className="text-xs text-muted-foreground mt-4 max-w-xs">
                Move within the office boundary to enable check-in.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live location */}
        <Card className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Live Location</h3>
            </div>

            {geoError ? (
              /* Geolocation error state */
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <MapPinOff className="h-7 w-7 text-red-400" />
                  </div>
                  <p className="text-sm text-red-300">{geoError}</p>
                </div>
                {errorCode !== "unsupported" && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
                    onClick={refetch}
                    disabled={geoLoading}
                  >
                    {geoLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Retry location
                  </Button>
                )}
              </div>
            ) : geoLoading && !coords ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="glass-card-light rounded-xl p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Distance from Office
                  </p>
                  <p className={cn(
                    "text-3xl font-bold",
                    isInsideRadius ? "text-emerald-400" : "text-red-400"
                  )}>
                    {distance !== null ? `${Math.round(distance)}m` : "—"}
                  </p>
                  {distance !== null && officeConfig && (
                    <p className="text-xs text-muted-foreground mt-1">
                      You are {Math.round(distance)}m from {officeConfig.officeName || "the office"}
                      {isInsideRadius ? " — within range." : ` — ${officeConfig.radiusMeters}m allowed.`}
                    </p>
                  )}
                </div>

                <div className="glass-card-light rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        GPS Accuracy
                      </span>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      isAccuracyBlocked ? "text-red-400" : isAccuracyLow ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {coords ? `±${Math.round(coords.accuracy)}m` : "—"}
                    </span>
                  </div>
                </div>

                {isAccuracyLow && !isAccuracyBlocked && (
                  <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Low GPS accuracy. Move to an open area for better results.</p>
                  </div>
                )}
                {isAccuracyBlocked && (
                  <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>GPS accuracy too poor. Check-in is disabled until it improves.</p>
                  </div>
                )}

                <div className={cn(
                  "p-4 rounded-xl flex items-center gap-3 border",
                  isInsideRadius
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                )}>
                  {isInsideRadius ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">
                        Inside office boundary
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <span className="text-sm font-medium text-red-300">
                        Outside office boundary
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent history */}
      <Card className="glass-card rounded-2xl overflow-hidden opacity-0 animate-fade-in-delay-3">
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-4">Recent History · Last 30 Days</h3>
          <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Check In</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Check Out</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.04]">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentAttendance.length > 0 ? (
                  recentAttendance.slice(0, 10).map((record) => (
                    <TableRow key={record.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell className="font-medium text-sm">
                        {format(record.checkInTime.toDate(), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(record.checkInTime.toDate(), "hh:mm a")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.checkOutTime ? format(record.checkOutTime.toDate(), "hh:mm a") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-xs font-semibold border-none rounded-full px-3",
                          record.status === "present"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : record.status === "late"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-500/20 text-red-300"
                        )}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {Math.round(record.distanceFromOffice)}m
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Clock className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No attendance records yet.</p>
                        <p className="text-xs opacity-70">
                          Your check-ins will appear here.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
