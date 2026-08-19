document.addEventListener("DOMContentLoaded", async function () {
    const form = document.getElementById("adminLoginForm");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const button = document.getElementById("adminLoginButton");
    const message = document.getElementById("loginMessage");
    const toggle = document.getElementById("passwordToggle");

    function showMessage(text) {
        message.textContent = text;
        message.classList.add("show");
    }

    function setLoading(loading) {
        button.disabled = loading;
        button.innerHTML = loading
            ? '<span>Checking Access</span><i class="fa-solid fa-circle-notch fa-spin"></i>'
            : '<span>Enter Admin Dashboard</span><i class="fa-solid fa-arrow-right"></i>';
    }

    if (!window.supabaseClient) {
        showMessage(
            "Copy your working DOSTEA user-site supabase.js into this admin project."
        );
        return;
    }

    if (new URLSearchParams(window.location.search).get("error") === "admin-access") {
        showMessage("This account is not enabled in the DOSTEA admins table. Run admin-setup.sql in the same Supabase project.");
    }

    async function verifyAdmin(user) {
        const { data, error } = await window.supabaseClient
            .from("admins")
            .select("user_id,is_active")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (error) throw error;
        return Boolean(data);
    }

    toggle.addEventListener("click", function () {
        const show = passwordInput.type === "password";

        passwordInput.type = show ? "text" : "password";

        toggle.innerHTML = show
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';
    });

    // If already logged in, directly open dashboard
    try {
        const { data, error } =
            await window.supabaseClient.auth.getUser();

        if (!error && data?.user) {
            if (await verifyAdmin(data.user)) {
                window.location.replace("index.html");
                return;
            }
            await window.supabaseClient.auth.signOut();
        }
    } catch (error) {
        console.error("Session check error:", error);
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        message.classList.remove("show");
        setLoading(true);

        try {
            const { data, error } =
                await window.supabaseClient.auth.signInWithPassword({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                });

            if (error) {
                throw error;
            }

            if (!data?.user) {
                throw new Error("Login failed. User session was not created.");
            }

            if (!(await verifyAdmin(data.user))) {
                await window.supabaseClient.auth.signOut();
                throw new Error("This account is not enabled as a DOSTEA admin. Run admin-setup.sql first.");
            }

            // Login successful and admin membership verified
            window.location.replace("index.html");

        } catch (error) {
            console.error("Admin login error:", error);

            showMessage(
                error.message || "Unable to sign in."
            );

            setLoading(false);
        }
    });
});
