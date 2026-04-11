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
import { format, subDays } from "date-fns";
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
      const officeSnap = await getDoc(doc(db, "officeConfig", "default"));
      if (officeSnap.exists()) {
        setOfficeConfig(officeSnap.data() as OfficeConfig);
      }

      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "employee")));
      const totalEmployees = usersSnap.size;

      const today = format(new Date(), "yyyy-MM-dd");
      const attendanceSnap = await getDocs(query(collection(db, "attendance"), where("date", "==", today)));
      const todayRecords = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      
      const presentToday = todayRecords.length;
      const lateToday = todayRecords.filter(r => r.status === 'late').length;
      const absentToday = totalEmployees - presentToday;

      setStats({ totalEmployees, presentToday, absentToday, lateToday });
      setTodayAttendance(todayRecords);

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

  const statCards = [
    { label: "Total Employees", value: stats.totalEmployees, icon: Users, gradient: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
    { label: "Present Today", value: stats.presentToday, icon: UserCheck, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
    { label: "Absent Today", value: stats.absentToday, icon: UserX, gradient: "from-red-500/20 to-red-500/5", iconColor: "text-red-400" },
    { label: "Late Today", value: stats.lateToday, icon: Clock, gradient: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight opacity-0 animate-fade-in">Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in-delay">
        {statCards.map((stat, i) => (
          <Card key={i} className="glass-card rounded-2xl hover:border-white/[0.12] transition-all duration-300">
            <CardContent className="p-5">
              <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", stat.gradient)}>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-0 animate-fade-in-delay-2">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">7-Day Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "12px",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="present" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Office Info */}
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Office Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square glass-card-light rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-24 w-24 bg-primary/10 rounded-full border-2 border-primary/20 flex items-center justify-center animate-pulse">
                   <div className="h-4 w-4 bg-primary rounded-full" />
                 </div>
               </div>
               <MapPin className="h-8 w-8 text-primary relative z-10" />
               <p className="mt-4 text-xs text-muted-foreground font-medium uppercase tracking-wider relative z-10">Geofence Active</p>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: "Office Name", value: officeConfig?.officeName || "N/A" },
                { label: "Radius", value: `${officeConfig?.radiusMeters || "—"}m` },
                { label: "Late Threshold", value: officeConfig?.lateThresholdTime || "—" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center glass-card-light rounded-lg px-3 py-2.5">
                  <span className="text-muted-foreground text-xs">{item.label}</span>
                  <span className="font-semibold text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance Table */}
      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay-3">
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Check In</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Distance</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAttendance.length > 0 ? (
                  todayAttendance.map((record) => (
                    <TableRow key={record.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.userName}</p>
                          <p className="text-xs text-muted-foreground">{record.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{format(record.checkInTime.toDate(), "hh:mm a")}</TableCell>
                      <TableCell className="text-sm">{Math.round(record.distanceFromOffice)}m</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-xs font-semibold border-none rounded-full px-3",
                          record.status === 'present' ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                        )}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.isSuspicious ? (
                          <div className="flex items-center gap-1 text-orange-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Suspicious</span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium uppercase">Clean</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No one has checked in today yet.
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
