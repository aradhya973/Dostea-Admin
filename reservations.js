
document.addEventListener("DOMContentLoaded", function () {
    let cache=[];
    let active="all";
    let query="";

    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadReservations(){
        if(!(await waitForAdmin())) return;

        const {data,error}=await window.supabaseClient
            .from("reservations")
            .select("id,reservation_number,user_id,customer_name,customer_email,phone,reservation_date,reservation_time,guests,seating_preference,special_request,table_number,status,created_at,updated_at")
            .order("created_at",{ascending:false});

        if(error){
            window.dosteaToast?.("Reservations Error",error.message);
            return;
        }

        cache=data||[];
        render();
    }

    function render(){
        const rows=cache.filter(r=>{
            const statusOk=active==="all" || r.status===active;
            const text=`${r.customer_name||""} ${r.customer_email||""} ${r.phone||""}`.toLowerCase();
            return statusOk && (!query || text.includes(query));
        });

        document.getElementById("reservationsTable").innerHTML = rows.length ? `
            <table class="admin-table">
                <thead><tr>
                    <th>RESERVATION</th><th>CUSTOMER</th><th>DATE / TIME</th><th>GUESTS</th>
                    <th>SEATING</th><th>STATUS</th><th>ACTION</th>
                </tr></thead>
                <tbody>
                ${rows.map(r=>`
                    <tr>
                        <td><span class="cell-title">#${window.dosteaSafe(r.reservation_number||r.id.slice(0,8))}</span>
                            <span class="cell-sub">${new Date(r.created_at).toLocaleString("en-IN")}</span></td>
                        <td><span class="cell-title">${window.dosteaSafe(r.customer_name)}</span>
                            <span class="cell-sub">${window.dosteaSafe(r.customer_email||"")} • ${window.dosteaSafe(r.phone||"")}</span></td>
                        <td>${window.dosteaSafe(r.reservation_date)}<br><span class="cell-sub">${window.dosteaSafe(r.reservation_time)}</span></td>
                        <td>${Number(r.guests||0)}</td>
                        <td>${window.dosteaSafe(r.seating_preference||"—")}<br><span class="cell-sub">Table ${window.dosteaSafe(r.table_number||"pending")}</span></td>
                        <td>${window.dosteaStatusPill(r.status)}</td>
                        <td><div class="table-actions">
                            ${r.status==="pending" ? `
                                <button class="table-action" data-res-id="${r.id}" data-res-status="confirmed" type="button">Confirm</button>
                                <button class="table-action" data-res-id="${r.id}" data-res-status="rejected" type="button">Reject</button>
                            ` : ""}
                            ${r.status==="confirmed" ? `
                                <button class="table-action" data-res-id="${r.id}" data-res-status="completed" type="button">Complete</button>
                            ` : ""}
                        </div></td>
                    </tr>`).join("")}
                </tbody>
            </table>` : '<div class="empty-state">No reservations found.</div>';

        document.querySelectorAll("[data-res-id]").forEach(btn=>{
            btn.addEventListener("click",()=>updateReservation(btn.dataset.resId,btn.dataset.resStatus));
        });
    }

    async function updateReservation(id,status){
        const {error}=await window.supabaseClient
            .from("reservations")
            .update({status,updated_at:new Date().toISOString()})
            .eq("id",id);

        if(error){
            window.dosteaToast?.("Update Failed",error.message);
            return;
        }

        window.dosteaToast?.("Reservation Updated",`Reservation is now ${window.dosteaStatus(status)}.`);
        window.dosteaSendNotification?.("reservation_status",id);
        loadReservations();
    }

    document.querySelectorAll("#reservationTabs [data-status]").forEach(btn=>{
        btn.addEventListener("click",()=>{
            document.querySelectorAll("#reservationTabs .admin-tab").forEach(b=>b.classList.remove("active"));
            btn.classList.add("active");
            active=btn.dataset.status;
            render();
        });
    });

    document.getElementById("reservationSearch").addEventListener("input",e=>{
        query=e.target.value.trim().toLowerCase();
        render();
    });

    window.addEventListener("dostea-admin-refresh",loadReservations);

    waitForAdmin().then(ok=>{
        if(!ok) return;
        loadReservations();
        window.supabaseClient
            .channel("dostea-admin-reservations-page")
            .on("postgres_changes",{event:"*",schema:"public",table:"reservations"},loadReservations)
            .subscribe();
    });
});
