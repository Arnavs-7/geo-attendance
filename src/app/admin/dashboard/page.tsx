"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, UserCheck, UserX, Clock, AlertTriangle, MapPin } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AttendanceRecord, OfficeConfig } from "@/types";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch office config
      const officeSnap = await getDoc(doc(db, "officeConfig", "default"));
      if (officeSnap.exists()) {
        setOfficeConfig(officeSnap.data() as OfficeConfig);
      }

      // Fetch total employees
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "employee")));
      const totalEmployees = usersSnap.size;

      // Fetch today's attendance
      const today = format(new Date(), "yyyy-MM-dd");
      const attendanceSnap = await getDocs(query(collection(db, "attendance"), where("date", "==", today)));
      const todayRecords = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      
      const presentToday = todayRecords.length;
      const lateToday = todayRecords.filter(r => r.status === 'late').length;
      const absentToday = totalEmployees - presentToday;

      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
      });
      setTodayAttendance(todayRecords);

      // Fetch 7-day trend
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const snap = await getDocs(query(collection(db, "attendance"), where("date", "==", dateStr)));
        trendData.push({
          name: format(date, "EEE"),
          present: snap.size,
        });
      }
      setChartData(trendData);
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Employees</p>
            <p className="text-2xl font-bold">{stats.totalEmployees}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-full">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Present Today</p>
            <p className="text-2xl font-bold">{stats.presentToday}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <UserX className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Absent Today</p>
            <p className="text-2xl font-bold">{stats.absentToday}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-full">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Late Today</p>
            <p className="text-2xl font-bold">{stats.lateToday}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>7-Day Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Office Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Office Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center relative overflow-hidden border">
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-24 w-24 bg-primary/10 rounded-full border-2 border-primary/20 flex items-center justify-center animate-pulse">
                   <div className="h-4 w-4 bg-primary rounded-full" />
                 </div>
               </div>
               <MapPin className="h-8 w-8 text-primary relative z-10" />
               <p className="mt-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">Office Geofence active</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Office Name</span>
                <span className="font-medium">{officeConfig?.officeName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Radius</span>
                <span className="font-medium">{officeConfig?.radiusMeters}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Late Threshold</span>
                <span className="font-medium">{officeConfig?.lateThresholdTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayAttendance.length > 0 ? (
                todayAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.userName}</p>
                        <p className="text-xs text-muted-foreground">{record.employeeId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Note: Department needs to be fetched or denormalized */}
                      <span className="text-sm">Engineering</span>
                    </TableCell>
                    <TableCell>{format(record.checkInTime.toDate(), "hh:mm a")}</TableCell>
                    <TableCell>{Math.round(record.distanceFromOffice)}m</TableCell>
                    <TableCell>
                       <Badge variant={record.status === 'present' ? 'default' : 'secondary'}
                             className={cn(record.status === 'present' ? "bg-green-500" : "bg-amber-500 text-white")}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.isSuspicious ? (
                        <div className="flex items-center gap-1 text-orange-600" title={record.suspiciousReason || "Suspicious activity"}>
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Suspicious</span>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 font-medium uppercase">Clean</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No one has checked in today yet.
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

