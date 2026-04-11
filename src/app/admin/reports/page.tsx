"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Loader2, TrendingUp, Users, PieChart as PieIcon, BarChart as BarIcon, Calendar as CalendarIcon, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { AttendanceRecord, UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

// Static imports for child components and utilities
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Pie, Cell, Line, Legend 
} from "recharts";

// Dynamic imports only for top-level chart containers
const BarChart = dynamic(() => import('recharts').then((m) => ({ default: m.BarChart })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((m) => ({ default: m.PieChart })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then((m) => ({ default: m.LineChart })), { ssr: false });

const COLORS = ["#3b82f6", "#818cf8", "#6366f1", "#4f46e5", "#3730a3"];

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [empRateData, setEmpRateData] = useState<any[]>([]);
  const [dailyTrendData, setDailyTrendData] = useState<any[]>([]);
  const [lowAttendanceEmps, setLowAttendanceEmps] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const empSnap = await getDocs(query(collection(db, "users"), where("role", "==", "employee")));
        const emps = empSnap.docs.map(doc => doc.data() as UserProfile);
        setEmployees(emps);

        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const attSnap = await getDocs(query(collection(db, "attendance"), orderBy("checkInTime", "asc")));
        const atts = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord))
                        .filter(a => {
                          const date = a.checkInTime.toDate();
                          return date >= start && date <= end;
                        });
        setAttendance(atts);

        const depts = Array.from(new Set(emps.map(e => e.department)));
        const deptRates = depts.map(dept => {
          const deptEmps = emps.filter(e => e.department === dept);
          const deptAtts = atts.filter(a => deptEmps.some(e => e.uid === a.userId));
          const rate = deptEmps.length > 0 ? (deptAtts.length / (deptEmps.length * 22)) * 100 : 0; 
          return { name: dept, value: Math.round(rate) };
        });
        setDeptData(deptRates);

        const empRates = emps.map(emp => {
          const empAtts = atts.filter(a => a.userId === emp.uid);
          const rate = (empAtts.length / 22) * 100;
          return { name: emp.name, rate: Math.round(rate), dept: emp.department };
        }).sort((a, b) => b.rate - a.rate);
        setEmpRateData(empRates);

        setLowAttendanceEmps(empRates.filter(e => e.rate < 75));

        const days = eachDayOfInterval({ start, end: new Date() });
        const trend = days.map(day => {
          const count = atts.filter(a => isSameDay(a.checkInTime.toDate(), day)).length;
          return { date: format(day, "MMM dd"), count };
        });
        setDailyTrendData(trend);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartTooltipStyle = {
    contentStyle: {
      background: "rgba(15, 23, 42, 0.9)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(59, 130, 246, 0.2)",
      borderRadius: "12px",
      fontSize: "12px",
      color: "#e2e8f0",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    },
    itemStyle: { color: "#e2e8f0" },
    labelStyle: { color: "#94a3b8", marginBottom: "4px", fontWeight: "bold" },
  };

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground animate-pulse">Generating analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Comprehensive overview of monthly attendance patterns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-0 animate-fade-in-delay">
        {/* Monthly Attendance per Employee */}
        <Card className="glass-card rounded-2xl overflow-hidden border-white/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarIcon className="h-5 w-5 text-primary" />
              Employee Attendance Rate
            </CardTitle>
            <CardDescription className="text-muted-foreground/70">Percentage of working days present per employee.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empRateData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: "rgba(255,255,255,0.5)" }}
                />
                <YAxis 
                  unit="%" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: "rgba(255,255,255,0.5)" }}
                />
                <Tooltip 
                  cursor={{ fill: "rgba(255,255,255,0.03)" }} 
                  {...chartTooltipStyle}
                />
                <Bar dataKey="rate" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department-wise Rate */}
        <Card className="glass-card rounded-2xl overflow-hidden border-white/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieIcon className="h-5 w-5 text-indigo-400" />
              Department Matrix
            </CardTitle>
            <CardDescription className="text-muted-foreground/70">Average attendance percentage distribution.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
                <Legend 
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border-white/[0.06] opacity-0 animate-fade-in-delay-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-emerald-400" />
              Participation Trend
            </CardTitle>
            <CardDescription className="text-muted-foreground/70">Daily check-in volume for the current month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis 
                  dataKey="date" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: "rgba(255,255,255,0.5)" }}
                />
                <YAxis 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: "rgba(255,255,255,0.5)" }}
                />
                <Tooltip {...chartTooltipStyle} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#10b981" }}
                  activeDot={{ r: 7, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Critical Attention List */}
        <Card className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border-red-500/20 opacity-0 animate-fade-in-delay-3">
          <CardHeader className="bg-red-500/5 border-b border-red-500/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-400 text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  Compliance Watchlist
                </CardTitle>
                <CardDescription className="text-red-300/60 mt-0.5">Employees below the 75% monthly threshold.</CardDescription>
              </div>
              <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/5">
                {lowAttendanceEmps.length} CRITICAL
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lowAttendanceEmps.length > 0 ? (
                lowAttendanceEmps.map((emp) => (
                  <div key={emp.name} className="p-5 rounded-2xl glass-card-light border-white/[0.04] hover:border-red-500/20 transition-all group">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                        <span className="text-red-400 font-bold">{emp.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{emp.dept}</p>
                      </div>
                      <div className="pt-2">
                        <span className="text-2xl font-black text-red-400">{emp.rate}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <ShieldCheck className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-400">Perfect Compliance</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">No employees are currently below the attendance threshold. Excellent work!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
