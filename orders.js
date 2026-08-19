
document.addEventListener("DOMContentLoaded", function () {
    let cache = [];
    let activeStatus = "all";
    let query = "";
    let selected = null;

    const table = document.getElementById("ordersTable");
    const modal = document.getElementById("orderModal");

    async function waitForAdmin() {
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadOrders() {
        if (!(await waitForAdmin())) return;

        const {data:orders,error} =
            await window.supabaseClient
                .from("orders")
                .select("id,order_number,user_id,customer_name,customer_email,order_type,status,subtotal,tax,packaging,total,payment_method,table_number,created_at,updated_at")
                .order("created_at",{ascending:false})
                .limit(150);

        if(error){
            window.dosteaToast?.("Orders Error",error.message);
            return;
        }

        const ids=(orders||[]).map(o=>o.id);
        let items=[];

        if(ids.length){
            const {data:itemRows,error:itemError} =
                await window.supabaseClient
                    .from("order_items")
                    .select("id,order_id,name,category,price,quantity")
                    .in("order_id",ids);

            if(itemError){
                window.dosteaToast?.("Items Error",itemError.message);
                return;
            }
            items=itemRows||[];
        }

        cache=(orders||[]).map(o=>({
            ...o,
            items:items.filter(i=>i.order_id===o.id)
        }));

        render();
    }

    function filtered() {
        return cache.filter(o=>{
            const statusOk=activeStatus==="all" || o.status===activeStatus;
            const text=`${o.order_number||""} ${o.customer_name||""} ${o.customer_email||""}`.toLowerCase();
            const searchOk=!query || text.includes(query);
            return statusOk && searchOk;
        });
    }

    function render() {
        const data=filtered();

        if(!data.length){
            table.innerHTML='<div class="empty-state">No orders found.</div>';
            return;
        }

        table.innerHTML=`
            <table class="admin-table">
                <thead><tr>
                    <th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TYPE</th>
                    <th>PAYMENT</th><th>TOTAL</th><th>STATUS</th><th>ACTION</th>
                </tr></thead>
                <tbody>
                ${data.map(o=>`
                    <tr>
                        <td><span class="cell-title">#${window.dosteaSafe(o.order_number)}</span>
                            <span class="cell-sub">${new Date(o.created_at).toLocaleString("en-IN")}</span></td>
                        <td><span class="cell-title">${window.dosteaSafe(o.customer_name)}</span>
                            <span class="cell-sub">${window.dosteaSafe(o.customer_email)}</span></td>
                        <td>${o.items?.length ? o.items.map(i=>`${window.dosteaSafe(i.name)} × ${Number(i.quantity||1)}`).slice(0,2).join("<br>") : "—"}</td>
                        <td>${window.dosteaSafe(window.dosteaStatus(o.order_type))}</td>
                        <td>${window.dosteaSafe(o.payment_method || "Not selected")}</td>
                        <td>${window.dosteaMoney(o.total)}</td>
                        <td>${window.dosteaStatusPill(o.status)}</td>
                        <td><div class="table-actions">
                            <button class="table-action" data-view="${o.id}" type="button"><i class="fa-regular fa-eye"></i> View</button>
                            ${o.status==="pending" ? `<button class="table-action" data-status-id="${o.id}" data-status="accepted" type="button">Accept</button>` : ""}
                        </div></td>
                    </tr>`).join("")}
                </tbody>
            </table>`;

        table.querySelectorAll("[data-view]").forEach(btn=>{
            btn.addEventListener("click",()=>openOrder(btn.dataset.view));
        });

        table.querySelectorAll("[data-status-id]").forEach(btn=>{
            btn.addEventListener("click",()=>updateStatus(btn.dataset.statusId,btn.dataset.status));
        });
    }

    function openOrder(id) {
        selected=cache.find(o=>o.id===id);
        if(!selected) return;

        document.getElementById("modalOrderNumber").textContent="#"+selected.order_number;
        document.getElementById("modalCustomer").textContent=selected.customer_name || "DOSTEA Customer";
        document.getElementById("modalOrderType").textContent=window.dosteaStatus(selected.order_type);
        document.getElementById("modalPayment").textContent=selected.payment_method || "Not selected";
        document.getElementById("modalStatus").textContent=window.dosteaStatus(selected.status);
        document.getElementById("modalOrderTotal").textContent=window.dosteaMoney(selected.total);

        document.getElementById("modalOrderItems").innerHTML =
            selected.items?.length
                ? selected.items.map(i=>`
                    <div class="order-item-row">
                        <div><strong>${window.dosteaSafe(i.name)}</strong><span class="cell-sub">${window.dosteaSafe(i.category||"")}</span></div>
                        <span>× ${Number(i.quantity||1)}</span>
                        <strong>${window.dosteaMoney(Number(i.price||0)*Number(i.quantity||1))}</strong>
                    </div>`).join("")
                : '<div class="empty-state">No item details.</div>';

        document.getElementById("modalStatusActions").innerHTML = [
            ["accepted","Accept"],
            ["preparing","Preparing"],
            ["ready","Ready"],
            ["completed","Complete"],
            ["cancelled","Cancel"]
        ].map(([status,label])=>`
            <button class="btn ${status==="cancelled"?"btn-danger":""}" data-modal-status="${status}" type="button">${label}</button>
        `).join("");

        document.querySelectorAll("[data-modal-status]").forEach(btn=>{
            btn.addEventListener("click",()=>updateStatus(selected.id,btn.dataset.modalStatus));
        });

        modal.classList.add("show");
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        modal.classList.remove("show");
        document.body.classList.remove("modal-open");
    }

    async function updateStatus(id,status) {
        const {error}=await window.supabaseClient
            .from("orders")
            .update({status,updated_at:new Date().toISOString()})
            .eq("id",id);

        if(error){
            window.dosteaToast?.("Update Failed",error.message);
            return;
        }

        window.dosteaToast?.("Order Updated",`Order moved to ${window.dosteaStatus(status)}.`);
        closeModal();
        loadOrders();
    }

    document.querySelectorAll("#orderTabs [data-status]").forEach(btn=>{
        btn.addEventListener("click",()=>{
            document.querySelectorAll("#orderTabs .admin-tab").forEach(b=>b.classList.remove("active"));
            btn.classList.add("active");
            activeStatus=btn.dataset.status;
            render();
        });
    });

    document.getElementById("orderSearch").addEventListener("input",e=>{
        query=e.target.value.trim().toLowerCase();
        render();
    });

    document.getElementById("closeOrderModal").addEventListener("click",closeModal);
    modal.addEventListener("click",e=>{if(e.target===modal) closeModal();});
    window.addEventListener("dostea-admin-refresh",loadOrders);

    waitForAdmin().then(ok=>{
        if(!ok) return;
        loadOrders();
        window.supabaseClient
            .channel("dostea-admin-orders-page")
            .on("postgres_changes",{event:"*",schema:"public",table:"orders"},loadOrders)
            .on("postgres_changes",{event:"*",schema:"public",table:"order_items"},loadOrders)
            .subscribe();
    });
});
