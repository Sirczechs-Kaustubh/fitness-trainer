// apps/web/app/profile/page.jsx
"use client";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";


export default function ProfilePage() {
const { user, ready } = useAuth({ requireAuth: true });
if (!ready) return null;
return (
<div className="mx-auto max-w-xl space-y-6">
<h1 className="text-2xl font-semibold">Profile</h1>
<Card>
<pre className="text-sm overflow-auto">{JSON.stringify(user, null, 2)}</pre>
</Card>
</div>
);
}