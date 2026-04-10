"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Loader2, TrendingUp, Users, PieChart as PieIcon, BarChart as BarIcon, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { AttendanceRecord, UserProfile } from "@/types";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

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
        // Fetch all employees
        const empSnap = await getDocs(query(collection(db, "users"), where("role", "==", "employee")));
        const emps = empSnap.docs.map(doc => doc.data() as UserProfile);
        setEmployees(emps);

        // Fetch current month attendance
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const attSnap = await getDocs(query(collection(db, "attendance"), orderBy("checkInTime", "asc")));
        const atts = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord))
                        .filter(a => {
                          const date = a.checkInTime.toDate();
                          return date >= start && date <= end;
                        });
        setAttendance(atts);

        // 1. Department-wise Attendance Rate
        const depts = Array.from(new Set(emps.map(e => e.department)));
        const deptRates = depts.map(dept => {
          const deptEmps = emps.filter(e => e.department === dept);
          const deptAtts = atts.filter(a => deptEmps.some(e => e.uid === a.userId));
          const rate = deptEmps.length > 0 ? (deptAtts.length / (deptEmps.length * 22)) * 100 : 0; // Assuming 22 working days
          return { name: dept, value: Math.round(rate) };
        });
        setDeptData(deptRates);

        // 2. Employee Monthly Attendance Rate
        const empRates = emps.map(emp => {
          const empAtts = atts.filter(a => a.userId === emp.uid);
          const rate = (empAtts.length / 22) * 100;
          return { name: emp.name, rate: Math.round(rate), dept: emp.department };
        }).sort((a, b) => b.rate - a.rate);
        setEmpRateData(empRates);

        // 3. Low Attendance Highlighting (< 75%)
        setLowAttendanceEmps(empRates.filter(e => e.rate < 75));

        // 4. Daily Attendance Trend
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

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Attendance per Employee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarIcon className="h-5 w-5" />
              Monthly Attendance Rate
            </CardTitle>
            <CardDescription>Percentage of working days present per employee.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empRateData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis unit="%" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: "transparent" }} 
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department-wise Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Department Attendance Rate
            </CardTitle>
            <CardDescription>Average attendance percentage across departments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Attendance Trend
            </CardTitle>
            <CardDescription>Number of check-ins per day for the current month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Critical Attention List */}
        <Card className="lg:col-span-2 border-red-100">
          <CardHeader className="bg-red-50/50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Critical: Low Attendance (Below 75%)
            </CardTitle>
            <CardDescription>Employees who have not met the minimum attendance requirement this month.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lowAttendanceEmps.length > 0 ? (
                lowAttendanceEmps.map((emp) => (
                  <div key={emp.name} className="p-4 rounded-lg border bg-white flex flex-col items-center justify-center text-center space-y-1">
                    <span className="font-bold">{emp.name}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{emp.dept}</span>
                    <span className="text-2xl font-black text-red-600">{emp.rate}%</span>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-10 text-center text-muted-foreground">
                  No employees currently below the threshold. Great job!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
