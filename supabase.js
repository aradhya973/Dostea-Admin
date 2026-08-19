
/* =========================================================
   DOSTEA — SUPABASE CLIENT
========================================================= */

const SUPABASE_URL =
    "https://gpmfwnhnmkilpncskxtc.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_his9pmnNWP_hVCSl7s9zHA_dgxvO-L0";


if (!window.supabase) {

    console.error(
        "DOSTEA: Supabase library failed to load."
    );

}
else {

    window.supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );


    console.log(
        "DOSTEA: Supabase connected successfully."
    );

}