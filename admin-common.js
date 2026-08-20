document.addEventListener("DOMContentLoaded", async function () {
    if (!window.supabaseClient) {
        alert("DOSTEA Admin: copy the working user-site supabase.js into this folder.");
        window.location.replace("admin-login.html");
        return;
    }

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const mobileBtn = document.getElementById("mobileMenuBtn");

    const navigation=document.querySelector(".sidebar-navigation");
    const profileLink=navigation?.querySelector('[href="admin-profile.html"]');
    const currentPage=location.pathname.split("/").pop()||"index.html";
    [
        ["admin-promotions.html","fa-solid fa-tags","Promotions"],
        ["admin-activity.html","fa-solid fa-clock-rotate-left","Activity Log"]
    ].forEach(([href,icon,label])=>{
        if(!navigation || navigation.querySelector(`[href="${href}"]`)) return;
        const link=document.createElement("a");
        link.href=href;
        link.className=`nav-link${currentPage===href?" active":""}`;
        link.innerHTML=`<span class="nav-icon"><i class="${icon}"></i></span><span>${label}</span>`;
        navigation.insertBefore(link,profileLink||null);
    });

    mobileBtn?.addEventListener("click", function () {
        sidebar?.classList.add("open");
        overlay?.classList.add("active");
    });

    overlay?.addEventListener("click", function () {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("active");
    });

    async function logout() {
        await window.supabaseClient.auth.signOut();
        window.location.replace("admin-login.html");
    }

    document
        .getElementById("sidebarLogout")
        ?.addEventListener("click", logout);

    // Check only Supabase Auth session.
    // Do NOT check the admins table here.
    const { data: authData, error: authError } =
        await window.supabaseClient.auth.getUser();

    if (authError || !authData?.user) {
        window.location.replace("admin-login.html");
        return;
    }

    const user = authData.user;

    const { data: adminMembership, error: adminError } =
        await window.supabaseClient
            .from("admins")
            .select("user_id,full_name,role,is_active")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

    if (adminError || !adminMembership) {
        console.error("DOSTEA admin access check failed:", adminError);
        await window.supabaseClient.auth.signOut();
        window.location.replace("admin-login.html?error=admin-access");
        return;
    }

    window.dosteaAdminUser = user;

    const name =
        adminMembership.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "DOSTEA Admin";

    const initial =
        name.trim().charAt(0).toUpperCase() || "A";

    [
        ["sidebarAdminName", name],
        ["topAdminName", name],
        ["sidebarAdminRole", adminMembership.role || "Admin"],
        ["sidebarAdminAvatar", initial],
        ["topAdminAvatar", initial]
    ].forEach(([id, value]) => {
        const el = document.getElementById(id);

        if (el) {
            el.textContent = value;
        }
    });

    document
        .getElementById("refreshPageBtn")
        ?.addEventListener("click", function () {
            window.dispatchEvent(
                new CustomEvent("dostea-admin-refresh")
            );
        });

    window.dosteaAdminLogout = logout;

    window.dosteaToast = function (title, message) {
        const toast =
            document.getElementById("adminToast");

        const titleEl =
            document.getElementById("toastTitle");

        const textEl =
            document.getElementById("toastText");

        if (!toast) return;

        if (titleEl) {
            titleEl.textContent = title;
        }

        if (textEl) {
            textEl.textContent = message;
        }

        toast.classList.add("show");

        clearTimeout(window.dosteaToastTimer);

        window.dosteaToastTimer = setTimeout(
            () => toast.classList.remove("show"),
            3800
        );
    };

    window.dosteaMoney = function (value) {
        return (
            "₹" +
            Math.round(Number(value) || 0)
                .toLocaleString("en-IN")
        );
    };

    window.dosteaSafe = function (value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    window.dosteaStatus = function (status) {
        return String(status || "pending")
            .replaceAll("-", " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    window.dosteaStatusPill = function (status) {
        const s =
            String(status || "pending").toLowerCase();

        return `
            <span class="status-pill status-${window.dosteaSafe(s)}">
                ${window.dosteaSafe(window.dosteaStatus(s))}
            </span>
        `;
    };
});
