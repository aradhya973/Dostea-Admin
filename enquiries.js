
document.addEventListener("DOMContentLoaded", function () {
    let cache=[];
    let active="all";

    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadEnquiries(){
        if(!(await waitForAdmin())) return;

        const {data,error}=await window.supabaseClient
            .from("contact_enquiries")
            .select("id,user_id,name,email,phone,subject,message,status,created_at,updated_at")
            .order("created_at",{ascending:false});

        if(error){
            document.getElementById("enquiriesTable").innerHTML=
                `<div class="empty-state">Enquiries table is not ready or the customer contact form is not connected yet.<br><span class="cell-sub">${window.dosteaSafe(error.message)}</span></div>`;
            return;
        }

        cache=data||[];
        render();
    }

    function render(){
        const rows=cache.filter(e=>active==="all" || (e.status||"new")===active);

        document.getElementById("enquiriesTable").innerHTML=rows.length?`
            <table class="admin-table">
                <thead><tr>
                    <th>CUSTOMER</th><th>SUBJECT</th><th>MESSAGE</th><th>DATE</th><th>STATUS</th><th>ACTION</th>
                </tr></thead>
                <tbody>
                ${rows.map(e=>`
                    <tr>
                        <td><span class="cell-title">${window.dosteaSafe(e.name||"DOSTEA Customer")}</span>
                            <span class="cell-sub">${window.dosteaSafe(e.email||"")} ${e.phone?"• "+window.dosteaSafe(e.phone):""}</span></td>
                        <td>${window.dosteaSafe(e.subject||"General Enquiry")}</td>
                        <td style="max-width:280px">${window.dosteaSafe(e.message||"")}</td>
                        <td>${new Date(e.created_at).toLocaleString("en-IN")}</td>
                        <td>${window.dosteaStatusPill(e.status||"new")}</td>
                        <td>${(e.status||"new")!=="resolved"
                            ? `<button class="table-action" data-resolve="${e.id}" type="button">Mark Resolved</button>`
                            : "—"}</td>
                    </tr>`).join("")}
                </tbody>
            </table>`:'<div class="empty-state">No enquiries found.</div>';

        document.querySelectorAll("[data-resolve]").forEach(btn=>{
            btn.addEventListener("click",()=>resolve(btn.dataset.resolve));
        });
    }

    async function resolve(id){
        const {error}=await window.supabaseClient
            .from("contact_enquiries")
            .update({status:"resolved",updated_at:new Date().toISOString()})
            .eq("id",id);

        if(error){
            window.dosteaToast?.("Update Failed",error.message);
            return;
        }

        window.dosteaToast?.("Enquiry Updated","Marked as resolved.");
        loadEnquiries();
    }

    document.querySelectorAll("#enquiryTabs [data-status]").forEach(btn=>{
        btn.addEventListener("click",()=>{
            document.querySelectorAll("#enquiryTabs .admin-tab").forEach(b=>b.classList.remove("active"));
            btn.classList.add("active");
            active=btn.dataset.status;
            render();
        });
    });

    window.addEventListener("dostea-admin-refresh",loadEnquiries);
    waitForAdmin().then(ok=>{if(ok) loadEnquiries();});
});
