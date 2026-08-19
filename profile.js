document.addEventListener("DOMContentLoaded", function () {
    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function init(){
        if(!(await waitForAdmin())) return;

        const user=window.dosteaAdminUser;
        const {data:admin,error:adminError}=await window.supabaseClient
            .from("admins")
            .select("full_name,role,is_active,created_at")
            .eq("user_id",user.id)
            .maybeSingle();

        if(adminError || !admin){
            window.dosteaToast?.("Profile Error",adminError?.message || "Admin profile was not found.");
            return;
        }

        const [{count:orderCount},{count:reservationCount}]=await Promise.all([
            window.supabaseClient.from("orders").select("id",{count:"exact",head:true}),
            window.supabaseClient.from("reservations").select("id",{count:"exact",head:true})
        ]);

        const displayName=admin.full_name || user.user_metadata?.full_name || "DOSTEA Admin";
        const role=String(admin.role||"admin").replace(/\b\w/g,c=>c.toUpperCase());
        const initial=displayName.trim().charAt(0).toUpperCase()||"A";

        document.getElementById("profileName").value =
            displayName;
        document.getElementById("profileEmail").value=user.email||"";
        document.getElementById("profileRole").value=role;
        document.getElementById("profileHeroAvatar").textContent=initial;
        document.getElementById("profileHeroName").textContent=displayName;
        document.getElementById("profileHeroEmail").textContent=user.email||"—";
        document.getElementById("profileHeroRole").innerHTML=`<i class="fa-solid fa-shield-halved"></i> ${role}`;
        document.getElementById("profileOrderCount").textContent=orderCount??0;
        document.getElementById("profileReservationCount").textContent=reservationCount??0;
        document.getElementById("profileMemberYear").textContent=new Date(admin.created_at||user.created_at).getFullYear();
        document.getElementById("profileOverviewEmail").textContent=user.email||"—";
        document.getElementById("profileOverviewRole").textContent=role;
        document.getElementById("profileLastSignIn").textContent=user.last_sign_in_at
            ? new Date(user.last_sign_in_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})
            : "Current session";

        document.getElementById("adminProfileForm").addEventListener("submit",async e=>{
            e.preventDefault();

            const name=document.getElementById("profileName").value.trim();
            if(!name) return;

            const {error}=await window.supabaseClient
                .from("admins")
                .update({full_name:name})
                .eq("user_id",user.id);

            if(error){
                window.dosteaToast?.("Profile Update Failed",error.message);
                return;
            }

            await window.supabaseClient.auth.updateUser({
                data:{full_name:name,name:name}
            });

            window.dosteaToast?.("Profile Saved","Admin profile updated.");
            setTimeout(()=>location.reload(),650);
        });

        document.getElementById("profileLogout").addEventListener("click",window.dosteaAdminLogout);
    }

    init();
});