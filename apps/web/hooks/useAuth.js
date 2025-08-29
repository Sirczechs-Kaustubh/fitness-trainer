// apps/web/hooks/useAuth.js
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";


export default function useAuth({ requireAuth = false } = {}) {
const router = useRouter();
const [user, setUser] = useState(null);
const [ready, setReady] = useState(false);


useEffect(() => {
const token = localStorage.getItem("token");
const userJson = localStorage.getItem("user");
if (userJson) setUser(JSON.parse(userJson));


if (requireAuth && !token) {
router.replace("/login");
return;
}
setReady(true);
}, [requireAuth, router]);


const login = useCallback((payload) => {
localStorage.setItem("token", payload.token);
localStorage.setItem("user", JSON.stringify(payload.user));
setUser(payload.user);
}, []);


const logout = useCallback(() => {
localStorage.removeItem("token");
localStorage.removeItem("user");
setUser(null);
}, []);


return { user, ready, login, logout };
}