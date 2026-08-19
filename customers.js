
document.addEventListener("DOMContentLoaded", function () {
    let cache=[];
    let query="";

    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadCustomers(){
        if(!(await waitForAdmin())) return;

        const [{data:profiles,error:pError},{data:orders,error:oError},{data:reservations,error:rError}] =
            await Promise.all([
                window.supabaseClient.from("profiles")
                    .select("id,full_name,phone,city,avatar_url,created_at,updated_at")
                    .order("created_at",{ascending:false}),
                window.supabaseClient.from("orders")
                    .select("user_id,customer_email,total,status"),
                window.supabaseClient.from("reservations")
                    .select("user_id,customer_email,status")
            ]);

        if(pError){
            window.dosteaToast?.("Customers Error",pError.message);
            return;
        }

        const orderRows=oError?[]:(orders||[]);
        const reservationRows=rError?[]:(reservations||[]);

        cache=(profiles||[]).map(p=>{
            const userOrders=orderRows.filter(o=>o.user_id===p.id);
            const userReservations=reservationRows.filter(r=>r.user_id===p.id);

            const email =
                userOrders.find(o=>o.customer_email)?.customer_email ||
                userReservations.find(r=>r.customer_email)?.customer_email ||
                "";

            return {
                ...p,
                email,
                orders:userOrders.length,
                reservations:userReservations.length,
                spent:userOrders.reduce((sum,o)=>sum+Number(o.total||0),0)
            };
        });

        render();
    }

    function render(){
        const rows=cache.filter(c=>{
            const text=`${c.full_name||""} ${c.email||""} ${c.phone||""} ${c.city||""}`.toLowerCase();
            return !query || text.includes(query);
        });

        document.getElementById("customersTable").innerHTML=rows.length?`
            <table class="admin-table">
                <thead><tr>
                    <th>CUSTOMER</th><th>PHONE</th><th>CITY</th><th>ORDERS</th><th>RESERVATIONS</th><th>ORDER VALUE</th>
                </tr></thead>
                <tbody>
                ${rows.map(c=>`
                    <tr>
                        <td><span class="cell-title">${window.dosteaSafe(c.full_name||"DOSTEA Customer")}</span>
                            <span class="cell-sub">${window.dosteaSafe(c.email||"Email not available")}</span></td>
                        <td>${window.dosteaSafe(c.phone||"—")}</td>
                        <td>${window.dosteaSafe(c.city||"—")}</td>
                        <td>${c.orders}</td>
                        <td>${c.reservations}</td>
                        <td>${window.dosteaMoney(c.spent)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>`:'<div class="empty-state">No customer profiles found.</div>';
    }

    document.getElementById("customerSearch").addEventListener("input",e=>{
        query=e.target.value.trim().toLowerCase();
        render();
    });

    window.addEventListener("dostea-admin-refresh",loadCustomers);
    waitForAdmin().then(ok=>{if(ok) loadCustomers();});
});
