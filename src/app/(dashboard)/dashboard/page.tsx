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
  Timestamp,
  GeoPoint,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistance, checkSpoofing } from "@/utils/geofence";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MapPin, CheckCircle2, Clock, AlertTriangle, Info, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "react-hot-toast";
import { AttendanceRecord, OfficeConfig } from "@/types";
import { cn } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { userProfile } = useAuth();
  const { coords, error: geoError, loading: geoLoading } = useGeolocation();
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, percentage: 0 });

  const fetchOfficeConfig = useCallback(async () => {
    const docRef = doc(db, "officeConfig", "default");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setOfficeConfig(docSnap.data() as OfficeConfig);
    }
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    if (!userProfile) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const q = query(
      collection(db, "attendance"),
      where("userId", "==", userProfile.uid),
      where("date", "==", today)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setTodayAttendance({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as AttendanceRecord);
    } else {
      setTodayAttendance(null);
    }
  }, [userProfile]);

  const fetchRecentAttendance = useCallback(async () => {
    if (!userProfile) return;
    const q = query(
      collection(db, "attendance"),
      where("userId", "==", userProfile.uid),
      orderBy("checkInTime", "desc"),
      limit(30)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    setRecentAttendance(records);

    // Calculate stats for current month
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const currentMonthRecords = records.filter(r => {
      const date = r.checkInTime.toDate();
      return date >= start && date <= end;
    });

    const present = currentMonthRecords.filter(r => r.status === 'present').length;
    const late = currentMonthRecords.filter(r => r.status === 'late').length;
    const totalWorkingDays = 22; // Hardcoded for demo/simplicity
    const percentage = Math.min(100, Math.round(((present + late) / totalWorkingDays) * 100));

    setStats({ present, late, absent: 0, percentage });
  }, [userProfile]);

  useEffect(() => {
    fetchOfficeConfig();
    fetchTodayAttendance();
    fetchRecentAttendance();
  }, [fetchOfficeConfig, fetchTodayAttendance, fetchRecentAttendance]);

  const distance = coords && officeConfig
    ? haversineDistance(coords.latitude, coords.longitude, officeConfig.latitude, officeConfig.longitude)
    : null;

  const isInsideRadius = distance !== null && officeConfig && distance <= officeConfig.radiusMeters;
  const isAccuracyLow = coords && coords.accuracy > 50;
  const isAccuracyBlocked = coords && coords.accuracy > 200;

  const handleMarkAttendance = async () => {
    if (!coords || !officeConfig || !userProfile) return;
    
    // Perform Anti-Spoofing checks
    if (isAccuracyBlocked) {
      toast.error("GPS accuracy is too low to mark attendance. Please move to an open area.");
      return;
    }

    if (isAccuracyLow) {
      toast("GPS accuracy is low, recording check-in with accuracy warning.", { icon: "⚠️" });
    }

    setMarkingLoading(true);
    try {
      // Anti-spoofing check for impossible speed or mock GPS
      const spoofCheck = checkSpoofing(coords.latitude, coords.longitude, Date.now());

      const today = format(new Date(), "yyyy-MM-dd");
      
      // Status Logic
      const checkInTime = new Date();
      const [lateHours, lateMinutes] = (officeConfig.lateThresholdTime || "09:30").split(":");
      const lateThreshold = new Date();
      lateThreshold.setHours(parseInt(lateHours), parseInt(lateMinutes), 0, 0);

      const status = checkInTime > lateThreshold ? "late" : "present";

      const attendanceData = {
        userId: userProfile.uid,
        userName: userProfile.name,
        employeeId: userProfile.employeeId,
        date: today,
        checkInTime: serverTimestamp(),
        checkOutTime: null,
        checkInLocation: new GeoPoint(coords.latitude, coords.longitude),
        checkOutLocation: null,
        status,
        distanceFromOffice: distance,
        gpsAccuracy: coords.accuracy,
        deviceInfo: navigator.userAgent,
        isSuspicious: spoofCheck.isSuspicious,
        suspiciousReason: spoofCheck.reason,
      };

      // Document ID format: {userId}_{date} ensures one record per day
      const docId = `${userProfile.uid}_${today}`;
      await setDoc(doc(db, "attendance", docId), attendanceData);

      toast.success(`Attendance marked as ${status.toUpperCase()} at ${format(checkInTime, "hh:mm a")}`);
      
      // Refresh local state
      await fetchTodayAttendance();
      await fetchRecentAttendance();
    } catch (error: any) {
      console.error("Mark Attendance Error:", error);
      toast.error(error.message || "Failed to mark attendance.");
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance || !coords || !userProfile) return;
    
    setMarkingLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const docId = `${userProfile.uid}_${today}`;
      
      await updateDoc(doc(db, "attendance", docId), {
        checkOutTime: serverTimestamp(),
        checkOutLocation: new GeoPoint(coords.latitude, coords.longitude),
      });

      toast.success("Checked out successfully!");
      
      // Refresh local state
      await fetchTodayAttendance();
      await fetchRecentAttendance();
    } catch (error: any) {
      console.error("Check Out Error:", error);
      toast.error(error.message || "Failed to check out.");
    } finally {
      setMarkingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Today's Status */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Today&apos;s Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            {todayAttendance ? (
              <div className="text-center space-y-2">
                <Badge variant={todayAttendance.status === 'present' ? 'default' : 'outline'} className="bg-green-500 hover:bg-green-600 text-white border-none px-4 py-1 text-base">
                  {todayAttendance.status.toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Checked in at {format(todayAttendance.checkInTime.toDate(), "hh:mm a")}
                </p>
                {todayAttendance.checkOutTime && (
                  <p className="text-sm text-muted-foreground">
                    Checked out at {format(todayAttendance.checkOutTime.toDate(), "hh:mm a")}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Badge variant="outline" className="px-4 py-1 text-base">NOT MARKED</Badge>
                <p className="text-sm text-muted-foreground">You haven&apos;t marked attendance today.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center border-t p-4">
             {!todayAttendance ? (
               <Button
                 className="w-full bg-green-600 hover:bg-green-700"
                 disabled={Boolean(!isInsideRadius || markingLoading || isAccuracyBlocked)}
                 onClick={handleMarkAttendance}
               >
                 {markingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Mark Attendance
               </Button>
             ) : !todayAttendance.checkOutTime ? (
               <Button
                 className="w-full"
                 variant="outline"
                 disabled={markingLoading}
                 onClick={handleCheckOut}
               >
                 {markingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Check Out
               </Button>
             ) : (
               <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                 <CheckCircle2 className="h-4 w-4" /> Completed for today
               </p>
             )}
          </CardFooter>
        </Card>

        {/* Live Location Panel */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Live Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Distance from Office</span>
              <span className={cn(
                "text-lg font-bold",
                isInsideRadius ? "text-green-600" : "text-red-600"
              )}>
                {distance !== null ? `${Math.round(distance)}m` : "Calculating..."}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>GPS Accuracy</span>
                <span className={cn(
                  "font-medium",
                  isAccuracyBlocked ? "text-red-600" : isAccuracyLow ? "text-amber-600" : "text-green-600"
                )}>
                  {coords ? `${Math.round(coords.accuracy)}m` : "Fetching..."}
                </span>
              </div>
              {isAccuracyLow && !isAccuracyBlocked && (
                <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>GPS accuracy is low. Please move to an open area for better results.</p>
                </div>
              )}
              {isAccuracyBlocked && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>GPS accuracy is too poor. Attendance marking is disabled.</p>
                </div>
              )}
            </div>

            <div className={cn(
              "p-3 rounded-lg flex items-center gap-3",
              isInsideRadius ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              {isInsideRadius ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">You are inside the office boundary</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">You are outside the office boundary</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats and History */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center space-y-1">
          <span className="text-sm text-muted-foreground">Present This Month</span>
          <span className="text-2xl font-bold text-green-600">{stats.present}</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center space-y-1">
          <span className="text-sm text-muted-foreground">Late This Month</span>
          <span className="text-2xl font-bold text-amber-600">{stats.late}</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center space-y-1">
          <span className="text-sm text-muted-foreground">Attendance Rate</span>
          <span className="text-2xl font-bold text-primary">{stats.percentage}%</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center space-y-1 text-center">
           <span className="text-xs text-muted-foreground uppercase font-semibold">Office Radius</span>
           <span className="text-xl font-bold">{officeConfig?.radiusMeters}m</span>
        </Card>
      </div>

      {/* Recent History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttendance.length > 0 ? (
                recentAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{format(record.checkInTime.toDate(), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(record.checkInTime.toDate(), "hh:mm a")}</TableCell>
                    <TableCell>
                      {record.checkOutTime ? format(record.checkOutTime.toDate(), "hh:mm a") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'}
                             className={cn(
                               record.status === 'present' && "bg-green-500",
                               record.status === 'late' && "bg-amber-500 text-white"
                             )}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{Math.round(record.distanceFromOffice)}m</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

