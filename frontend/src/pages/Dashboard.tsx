import { DollarSign, Users, Receipt, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../utils/format";

export default function DashboardPage() {
  const { t } = useTranslation();

  const stats = [
    {
      title: t("dashboard.stats.totalExpenses"),
      value: formatCurrency(2450.00),
      change: "+12.5%",
      icon: DollarSign,
      color: "bg-blue-500",
    },
    {
      title: t("dashboard.stats.activeGroups"),
      value: "4",
      change: "+2 this month",
      icon: Users,
      color: "bg-green-500",
    },
    {
      title: t("dashboard.stats.pendingSplits"),
      value: "8",
      change: "3 need action",
      icon: Receipt,
      color: "bg-orange-500",
    },
    {
      title: t("dashboard.stats.youOwe"),
      value: formatCurrency(125.50),
      change: "2 people",
      icon: TrendingUp,
      color: "bg-red-500",
    },
  ];

  const recentActivity = [
    {
      name: "Dinner at Italian Restaurant",
      amount: formatCurrency(85.00),
      group: "Friends",
      date: "2 hours ago",
    },
    {
      name: "Movie Tickets",
      amount: formatCurrency(45.00),
      group: "Weekend Squad",
      date: "1 day ago",
    },
    {
      name: "Groceries",
      amount: formatCurrency(120.50),
      group: "Roommates",
      date: "3 days ago",
    },
  ];

  return (
    <main
      className="min-h-dvh bg-theme [padding-top:calc(clamp(1rem,3vw,1.5rem)+env(safe-area-inset-top))] [padding-right:calc(clamp(0.75rem,4vw,1.5rem)+env(safe-area-inset-right))] [padding-bottom:calc(clamp(1rem,3vw,1.5rem)+env(safe-area-inset-bottom))] [padding-left:calc(clamp(0.75rem,4vw,1.5rem)+env(safe-area-inset-left))]"
      aria-label="Dashboard"
    >
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <header className="mb-[clamp(1.25rem,4vw,2rem)]">
          <h1 className="text-[clamp(1.375rem,5vw,1.875rem)] font-bold leading-tight text-theme">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-muted-theme mt-0.5">
            {t("dashboard.welcome")}
          </p>
        </header>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-[clamp(1.25rem,4vw,2rem)]">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card-theme rounded-xl shadow-sm p-4 sm:p-6 border border-theme overflow-hidden"
              >
                <div className="mb-3">
                  <div className={`${stat.color} p-2.5 rounded-lg w-fit`}>
                    <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-muted-theme text-xs sm:text-sm font-medium leading-snug truncate">
                  {stat.title}
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-theme mt-1 tabular-nums truncate">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-theme mt-1.5 truncate">
                  {stat.change}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">

          {/* Recent Activity */}
          <div className="bg-card-theme rounded-xl shadow-sm p-4 sm:p-6 border border-theme">
            <h2 className="text-lg sm:text-xl font-bold text-theme mb-4">
              {t("dashboard.recentActivity")}
            </h2>
            <div className="space-y-0">
              {recentActivity.map((activity, index) => (
                <Link
                  to={`/split/split_${index + 123}`}
                  key={index}
                  className="flex items-center justify-between min-h-[2.75rem] py-3 border-b border-theme last:border-b-0 gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 focus-visible:rounded-md [-webkit-tap-highlight-color:transparent] active:opacity-70 transition-opacity"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-theme text-sm sm:text-base truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-theme mt-0.5 truncate">
                      {activity.group} • {activity.date}
                    </p>
                  </div>
                  <p className="font-semibold text-theme text-sm sm:text-base tabular-nums shrink-0 truncate">
                    {activity.amount}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card-theme rounded-lg shadow p-6 border border-theme mt-8">
          <h2 className="text-xl font-bold text-theme mb-4">{t("dashboard.quickActions")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/create-split"
              className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition text-center"
            >
              {t("dashboard.actions.addExpense")}
            </Link>
            <button className="bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition">
              {t("dashboard.actions.createGroup")}
            </button>
            <button
              className="inline-flex items-center justify-center min-h-[2.75rem] px-4 rounded-lg bg-purple-500 truncate text-white text-sm font-medium transition-colors hover:bg-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 focus-visible:outline-offset-2 active:scale-[0.97] [-webkit-tap-highlight-color:transparent] select-none"
            >
              {t("dashboard.actions.settleUp")}
            </button>
            <button
              className="inline-flex items-center justify-center min-h-[2.75rem] px-4 rounded-lg bg-gray-500 truncate text-white text-sm font-medium transition-colors hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-500 focus-visible:outline-offset-2 active:scale-[0.97] [-webkit-tap-highlight-color:transparent] select-none"
            >
              {t("dashboard.actions.viewReports")}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}