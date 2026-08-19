
document.addEventListener("DOMContentLoaded", function () {
    const ordersBox = document.getElementById("dashboardOrders");
    const reservationsBox = document.getElementById("dashboardReservations");

    const money = () => window.dosteaMoney;
    const safe = () => window.dosteaSafe;
    const pill = () => window.dosteaStatusPill;

    async function waitForAdmin() {
        for (let i=0;i<30;i++) {
            if (window.dosteaAdminUser) return true;
            await new Promise(r => setTimeout(r,100));
        }
        return false;
    }

    async function loadDashboard() {
        if (!(await waitForAdmin())) return;

        try {
            const [{data:orders,error:orderError},{data:reservations,error:reservationError}] =
                await Promise.all([
                    window.supabaseClient
                        .from("orders")
                        .select("id,order_number,customer_name,customer_email,order_type,status,total,payment_method,created_at")
                        .order("created_at",{ascending:false})
                        .limit(100),
                    window.supabaseClient
                        .from("reservations")
                        .select("id,reservation_number,customer_name,reservation_date,reservation_time,guests,status,created_at")
                        .order("created_at",{ascending:false})
                        .limit(80)
                ]);

            if (orderError) throw orderError;
            if (reservationError) throw reservationError;

            const now = new Date();
            const today = (orders || []).filter(
                o => new Date(o.created_at).toDateString() === now.toDateString()
            );

            const revenue = today
                .filter(o => !["cancelled","rejected"].includes(o.status))
                .reduce((sum,o)=>sum+Number(o.total||0),0);

            document.getElementById("todayOrders").textContent = today.length;
            document.getElementById("todayRevenue").textContent = window.dosteaMoney(revenue);
            document.getElementById("pendingOrders").textContent =
                (orders || []).filter(o=>o.status==="pending").length;
            document.getElementById("pendingReservations").textContent =
                (reservations || []).filter(r=>r.status==="pending").length;

            if (!orders?.length) {
                ordersBox.innerHTML = '<div class="empty-state">No orders yet.</div>';
            } else {
                ordersBox.innerHTML = `
                    <table class="admin-table">
                        <thead><tr>
                            <th>ORDER</th><th>CUSTOMER</th><th>TOTAL</th><th>STATUS</th>
                        </tr></thead>
                        <tbody>
                        ${orders.slice(0,8).map(o=>`
                            <tr>
                                <td><span class="cell-title">#${window.dosteaSafe(o.order_number)}</span>
                                    <span class="cell-sub">${new Date(o.created_at).toLocaleString("en-IN")}</span></td>
                                <td><span class="cell-title">${window.dosteaSafe(o.customer_name)}</span>
                                    <span class="cell-sub">${window.dosteaSafe(o.customer_email)}</span></td>
                                <td>${window.dosteaMoney(o.total)}</td>
                                <td>${window.dosteaStatusPill(o.status)}</td>
                            </tr>`).join("")}
                        </tbody>
                    </table>`;
            }

            const pendingRes = (reservations || []).filter(r=>r.status==="pending").slice(0,6);

            reservationsBox.innerHTML = pendingRes.length
                ? pendingRes.map(r=>`
                    <div class="queue-item">
                        <strong>${window.dosteaSafe(r.customer_name)}</strong>
                        <span>${window.dosteaSafe(r.reservation_date)} • ${window.dosteaSafe(r.reservation_time)} • ${Number(r.guests||0)} guests</span>
                    </div>`).join("")
                : '<div class="empty-state">No pending reservation requests.</div>';

        } catch (error) {
            console.error(error);
            window.dosteaToast?.("Dashboard Error",error.message || "Unable to load dashboard.");
        }
    }

    document.getElementById("dashboardRefresh")?.addEventListener("click",loadDashboard);
    window.addEventListener("dostea-admin-refresh",loadDashboard);

    waitForAdmin().then(ok=>{
        if (!ok) return;
        loadDashboard();

        window.supabaseClient
            .channel("dostea-admin-dashboard")
            .on("postgres_changes",{event:"*",schema:"public",table:"orders"},payload=>{
                if (payload.eventType==="INSERT") {
                    window.dosteaToast?.(
                        "New Order",
                        `${payload.new?.customer_name || "A customer"} placed ${payload.new?.order_number || "an order"}.`
                    );
                }
                loadDashboard();
            })
            .on("postgres_changes",{event:"*",schema:"public",table:"reservations"},loadDashboard)
            .subscribe();
    });
});
