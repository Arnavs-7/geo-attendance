"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, UserCheck, LogOut, UserX, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";
import { AttendanceRecord, OfficeConfig, UserProfile } from "@/types";
import { computeStatus, localDateString } from "@/lib/attendance";
import { cn } from "@/lib/utils";

type LiveStatus = "in" | "out" | "absent";

interface EmployeeRow {
  employee: UserProfile;
  record: AttendanceRecord | null;
  liveStatus: LiveStatus;
}

interface TrendPoint {
  name: string;
  present: number;
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [chartData, setChartData] = useState<TrendPoint[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = localDateString();

        const [officeSnap, usersSnap, todaySnap] = await Promise.all([
          getDoc(doc(db, "officeConfig", "default")),
          getDocs(query(collection(db, "users"), where("role", "==", "employee"))),
          getDocs(query(collection(db, "attendance"), where("date", "==", today))),
        ]);

        if (officeSnap.exists()) setOfficeConfig(officeSnap.data() as OfficeConfig);

        const employees = usersSnap.docs.map((d) => d.data() as UserProfile);
        const records = todaySnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as AttendanceRecord)
        );
        const recordByUser = new Map(records.map((r) => [r.userId, r]));

        const employeeRows: EmployeeRow[] = employees
          .map((employee) => {
            const record = recordByUser.get(employee.uid) ?? null;
            const liveStatus: LiveStatus = !record
              ? "absent"
              : record.checkOutTime
              ? "out"
              : "in";
            return { employee, record, liveStatus };
          })
          .sort((a, b) => a.employee.name.localeCompare(b.employee.name));
        setRows(employeeRows);

        // 7-day trend
        const trend: TrendPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const snap = await getDocs(
            query(collection(db, "attendance"), where("date", "==", localDateString(date)))
          );
          trend.push({ name: format(date, "EEE"), present: snap.size });
        }
        setChartData(trend);
      } catch (error) {
        console.error("Admin overview error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const checkedIn = rows.filter((r) => r.liveStatus === "in").length;
  const checkedOut = rows.filter((r) => r.liveStatus === "out").length;
  const absent = rows.filter((r) => r.liveStatus === "absent").length;

  const statCards = [
    { label: "Total Employees", value: rows.length, icon: Users, gradient: "from-blue-500/20 to-blue-500/5", color: "text-blue-400" },
    { label: "Currently In", value: checkedIn, icon: UserCheck, gradient: "from-emerald-500/20 to-emerald-500/5", color: "text-emerald-400" },
    { label: "Checked Out", value: checkedOut, icon: LogOut, gradient: "from-violet-500/20 to-violet-500/5", color: "text-violet-400" },
    { label: "Not Checked In", value: absent, icon: UserX, gradient: "from-red-500/20 to-red-500/5", color: "text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Today&apos;s Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 opacity-0 animate-fade-in-delay">
        {statCards.map((stat, i) => (
          <Card key={i} className="glass-card rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", stat.gradient)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 7-day trend */}
      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay-2">
        <CardHeader>
          <CardTitle className="text-lg">7-Day Check-In Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {loading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Employee status list */}
      <Card className="glass-card rounded-2xl opacity-0 animate-fade-in-delay-3">
        <CardHeader>
          <CardTitle className="text-lg">Employee Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Check In</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Check Out</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.04]">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length > 0 ? (
                  rows.map(({ employee, record, liveStatus }) => {
                    const realStatus =
                      record &&
                      computeStatus(record.checkInTime, officeConfig?.lateThresholdTime);
                    return (
                      <TableRow key={employee.uid} className="border-white/[0.04] hover:bg-white/[0.02]">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {employee.name}
                              {employee.active === false && (
                                <span className="ml-2 text-[10px] uppercase text-red-400">Inactive</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {record ? format(record.checkInTime.toDate(), "hh:mm a") : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record?.checkOutTime
                            ? format(record.checkOutTime.toDate(), "hh:mm a")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-xs font-semibold border-none rounded-full px-3",
                            liveStatus === "in" && realStatus === "late"
                              ? "bg-amber-500/20 text-amber-300"
                              : liveStatus === "in"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : liveStatus === "out"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-red-500/20 text-red-300"
                          )}>
                            {liveStatus === "absent"
                              ? "Not in"
                              : liveStatus === "out"
                              ? "Checked out"
                              : realStatus === "late"
                              ? "In · Late"
                              : "In"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record?.isSuspicious ? (
                            <div className="flex items-center gap-1 text-orange-400" title={record.suspiciousReason || "Suspicious"}>
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase">Suspicious</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No employees registered yet.</p>
                        <p className="text-xs opacity-70">
                          Add employees from the Employees page.
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
