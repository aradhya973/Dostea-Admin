
document.addEventListener("DOMContentLoaded", function () {
    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadAnalytics(){
        if(!(await waitForAdmin())) return;

        const [{data:orders,error:oError},{data:reservations,error:rError}] =
            await Promise.all([
                window.supabaseClient.from("orders")
                    .select("id,status,total,order_type,payment_method,created_at"),
                window.supabaseClient.from("reservations")
                    .select("id,status,created_at")
            ]);

        if(oError){
            window.dosteaToast?.("Analytics Error",oError.message);
            return;
        }

        const orderRows=orders||[];
        const reservationRows=rError?[]:(reservations||[]);
        const activeRevenue=orderRows
            .filter(o=>!["cancelled","rejected"].includes(o.status))
            .reduce((sum,o)=>sum+Number(o.total||0),0);

        document.getElementById("analyticsOrders").textContent=orderRows.length;
        document.getElementById("analyticsRevenue").textContent=window.dosteaMoney(activeRevenue);
        document.getElementById("analyticsCompleted").textContent=orderRows.filter(o=>o.status==="completed").length;
        document.getElementById("analyticsReservations").textContent=reservationRows.length;

        const statuses=["pending","accepted","preparing","ready","completed","cancelled"];
        const max=Math.max(1,...statuses.map(s=>orderRows.filter(o=>o.status===s).length));

        document.getElementById("statusAnalytics").innerHTML=statuses.map(status=>{
            const count=orderRows.filter(o=>o.status===status).length;
            const width=Math.round((count/max)*100);
            return `
                <div class="progress-row">
                    <div class="progress-head">
                        <span>${window.dosteaStatus(status)}</span>
                        <strong>${count}</strong>
                    </div>
                    <div class="progress-track"><div class="progress-fill" style="width:${width}%"></div></div>
                </div>`;
        }).join("");

        const dineIn=orderRows.filter(o=>o.order_type==="dine-in").length;
        const takeaway=orderRows.filter(o=>o.order_type==="takeaway").length;
        const avg=orderRows.length?activeRevenue/orderRows.length:0;

        document.getElementById("operationalSummary").innerHTML=`
            <div class="detail-grid" style="grid-template-columns:1fr 1fr">
                <div class="detail-box"><span>AVERAGE ORDER VALUE</span><strong>${window.dosteaMoney(avg)}</strong></div>
                <div class="detail-box"><span>DINE-IN ORDERS</span><strong>${dineIn}</strong></div>
                <div class="detail-box"><span>TAKEAWAY ORDERS</span><strong>${takeaway}</strong></div>
                <div class="detail-box"><span>ACTIVE REVENUE</span><strong>${window.dosteaMoney(activeRevenue)}</strong></div>
            </div>`;
    }

    window.addEventListener("dostea-admin-refresh",loadAnalytics);
    waitForAdmin().then(ok=>{if(ok) loadAnalytics();});
});
