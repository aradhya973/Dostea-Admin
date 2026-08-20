document.addEventListener("DOMContentLoaded", function () {
    let allOrders=[];
    let allReservations=[];
    let allItems=[];

    const fromInput=document.getElementById("analyticsFrom");
    const toInput=document.getElementById("analyticsTo");
    const today=new Date();
    const from=new Date(today);
    from.setDate(from.getDate()-29);
    const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    fromInput.value=localDate(from);
    toInput.value=localDate(today);

    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadAnalytics(){
        if(!(await waitForAdmin())) return;

        const [ordersResult,reservationsResult,itemsResult]=await Promise.all([
            window.supabaseClient.from("orders").select("id,order_number,customer_name,status,subtotal,discount,loyalty_discount,tax,packaging,total,order_type,payment_method,coupon_code,created_at").order("created_at",{ascending:false}),
            window.supabaseClient.from("reservations").select("id,status,guests,created_at"),
            window.supabaseClient.from("order_items").select("order_id,name,price,quantity")
        ]);

        if(ordersResult.error){
            window.dosteaToast?.("Analytics Error",ordersResult.error.message);
            return;
        }

        allOrders=ordersResult.data||[];
        allReservations=reservationsResult.error?[]:(reservationsResult.data||[]);
        allItems=itemsResult.error?[]:(itemsResult.data||[]);
        render();
    }

    function inRange(dateValue){
        const date=String(dateValue||"").slice(0,10);
        return (!fromInput.value||date>=fromInput.value)&&(!toInput.value||date<=toInput.value);
    }

    function currentData(){
        const orders=allOrders.filter(o=>inRange(o.created_at));
        const orderIds=new Set(orders.map(o=>o.id));
        return {
            orders,
            reservations:allReservations.filter(r=>inRange(r.created_at)),
            items:allItems.filter(i=>orderIds.has(i.order_id))
        };
    }

    function render(){
        const {orders,reservations,items}=currentData();
        const revenueOrders=orders.filter(o=>!["cancelled","rejected"].includes(o.status));
        const activeRevenue=revenueOrders.reduce((sum,o)=>sum+Number(o.total||0),0);

        document.getElementById("analyticsOrders").textContent=orders.length;
        document.getElementById("analyticsRevenue").textContent=window.dosteaMoney(activeRevenue);
        document.getElementById("analyticsCompleted").textContent=orders.filter(o=>o.status==="completed").length;
        document.getElementById("analyticsReservations").textContent=reservations.length;

        const statuses=["pending","accepted","preparing","ready","completed","cancelled"];
        const max=Math.max(1,...statuses.map(s=>orders.filter(o=>o.status===s).length));
        document.getElementById("statusAnalytics").innerHTML=statuses.map(status=>{
            const count=orders.filter(o=>o.status===status).length;
            return `<div class="progress-row"><div class="progress-head"><span>${window.dosteaStatus(status)}</span><strong>${count}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(count/max*100)}%"></div></div></div>`;
        }).join("");

        const avg=orders.length?activeRevenue/orders.length:0;
        const discounts=orders.reduce((sum,o)=>sum+Number(o.discount||0)+Number(o.loyalty_discount||0),0);
        document.getElementById("operationalSummary").innerHTML=`<div class="detail-grid" style="grid-template-columns:1fr 1fr"><div class="detail-box"><span>AVERAGE ORDER VALUE</span><strong>${window.dosteaMoney(avg)}</strong></div><div class="detail-box"><span>DINE-IN ORDERS</span><strong>${orders.filter(o=>o.order_type==="dine-in").length}</strong></div><div class="detail-box"><span>TAKEAWAY ORDERS</span><strong>${orders.filter(o=>o.order_type==="takeaway").length}</strong></div><div class="detail-box"><span>DISCOUNTS GIVEN</span><strong>${window.dosteaMoney(discounts)}</strong></div></div>`;

        const byDay=new Map();
        revenueOrders.forEach(o=>{
            const key=String(o.created_at).slice(0,10);
            byDay.set(key,(byDay.get(key)||0)+Number(o.total||0));
        });
        const days=[...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
        const maxDay=Math.max(1,...days.map(([,value])=>value));
        document.getElementById("dailyRevenue").innerHTML=days.length?`<div class="revenue-bars">${days.map(([day,value])=>`<div class="revenue-bar-item" title="${day}: ${window.dosteaMoney(value)}"><strong>${window.dosteaMoney(value)}</strong><div class="revenue-bar" style="height:${Math.max(3,Math.round(value/maxDay*160))}px"></div><span>${day.slice(5)}</span></div>`).join("")}</div>`:'<div class="empty-state">No sales in this date range.</div>';

        const products=new Map();
        items.forEach(i=>{
            const current=products.get(i.name)||{quantity:0,revenue:0};
            current.quantity+=Number(i.quantity||1);
            current.revenue+=Number(i.price||0)*Number(i.quantity||1);
            products.set(i.name,current);
        });
        const top=[...products.entries()].sort((a,b)=>b[1].quantity-a[1].quantity).slice(0,10);
        document.getElementById("topProducts").innerHTML=top.length?`<div class="analytics-list">${top.map(([name,value],index)=>`<div class="analytics-list-row"><strong>${index+1}. ${window.dosteaSafe(name)}</strong><span>${value.quantity} sold</span><strong>${window.dosteaMoney(value.revenue)}</strong></div>`).join("")}</div>`:'<div class="empty-state">No item sales in this date range.</div>';
    }

    function csvCell(value){return `"${String(value??"").replaceAll('"','""')}"`;}
    function downloadCsv(){
        const {orders}=currentData();
        const headers=["Order Number","Date","Customer","Status","Type","Payment","Subtotal","Discount","Loyalty Discount","Tax","Packaging","Total","Coupon"];
        const lines=[headers,...orders.map(o=>[o.order_number,o.created_at,o.customer_name,o.status,o.order_type,o.payment_method,o.subtotal,o.discount,o.loyalty_discount,o.tax,o.packaging,o.total,o.coupon_code])];
        const blob=new Blob(["\ufeff"+lines.map(row=>row.map(csvCell).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});
        const link=document.createElement("a");
        link.href=URL.createObjectURL(blob);
        link.download=`dostea-sales-${fromInput.value}-to-${toInput.value}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function downloadPdf(){
        if(!window.jspdf?.jsPDF){window.dosteaToast?.("PDF Export","PDF library did not load.");return;}
        const {orders}=currentData();
        const doc=new window.jspdf.jsPDF({orientation:"landscape"});
        const revenue=orders.filter(o=>o.status!=="cancelled").reduce((sum,o)=>sum+Number(o.total||0),0);
        doc.setFontSize(18);doc.text("DOSTEA Sales Report",14,16);
        doc.setFontSize(10);doc.text(`${fromInput.value} to ${toInput.value} | ${orders.length} orders | Revenue Rs.${revenue.toFixed(2)}`,14,23);
        doc.autoTable({startY:29,head:[["Order","Date","Customer","Status","Type","Payment","Total"]],body:orders.map(o=>[o.order_number,new Date(o.created_at).toLocaleString("en-IN"),o.customer_name||"",window.dosteaStatus(o.status),window.dosteaStatus(o.order_type),o.payment_method||"",`Rs.${Number(o.total||0).toFixed(2)}`]),styles:{fontSize:7}});
        doc.save(`dostea-sales-${fromInput.value}-to-${toInput.value}.pdf`);
    }

    fromInput.addEventListener("change",render);
    toInput.addEventListener("change",render);
    document.getElementById("exportCsv").addEventListener("click",downloadCsv);
    document.getElementById("exportPdf").addEventListener("click",downloadPdf);
    window.addEventListener("dostea-admin-refresh",loadAnalytics);

    waitForAdmin().then(ok=>{
        if(!ok)return;
        loadAnalytics();
        window.supabaseClient.channel("dostea-admin-analytics")
            .on("postgres_changes",{event:"*",schema:"public",table:"orders"},loadAnalytics)
            .on("postgres_changes",{event:"*",schema:"public",table:"order_items"},loadAnalytics)
            .on("postgres_changes",{event:"*",schema:"public",table:"reservations"},loadAnalytics)
            .subscribe();
    });
});
