"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function AuthButton({ isLoggedIn }) {
const router = useRouter();
const supabase = createClient();

const [loading, setLoading] = useState(false);

async function handleLogout() {
setLoading(true);

await supabase.auth.signOut();

router.push("/login");
router.refresh();

}

if (isLoggedIn) {
return (
<button
onClick={handleLogout}
disabled={loading}
style={{
display: "inline-block",
padding: "10px 18px",
background: "#dc2626",
color: "#fff",
border: "none",
borderRadius: "7px",
fontWeight: "bold",
fontSize: "15px",
cursor: loading ? "not-allowed" : "pointer",
}}
>
{loading ? "Logging out..." : "Logout"}
</button>
);
}

return (
<a
href="/login"
style={{
display: "inline-block",
padding: "10px 18px",
background: "#2563eb",
color: "#fff",
borderRadius: "7px",
textDecoration: "none",
fontWeight: "bold",
fontSize: "15px",
}}
>
Login
</a>
);
}
