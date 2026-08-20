
document.addEventListener("DOMContentLoaded", function () {
    let cache=[];
    let category="all";
    let query="";

    const modal=document.getElementById("menuModal");

    async function waitForAdmin(){
        for(let i=0;i<30;i++){
            if(window.dosteaAdminUser) return true;
            await new Promise(r=>setTimeout(r,100));
        }
        return false;
    }

    async function loadMenu(){
        if(!(await waitForAdmin())) return;

        const {data,error}=await window.supabaseClient
            .from("menu_items")
            .select("id,slug,name,category,description,price,image_url,is_available,is_featured,stock_quantity,low_stock_threshold,created_at,updated_at")
            .order("created_at",{ascending:false});

        if(error){
            document.getElementById("menuAdminGrid").innerHTML =
                `<div class="empty-state" style="grid-column:1/-1">
                    Menu table is not ready yet. Run admin-setup.sql first.<br>
                    <span class="cell-sub">${window.dosteaSafe(error.message)}</span>
                </div>`;
            return;
        }

        cache=data||[];
        render();
    }

    function render(){
        const rows=cache.filter(i=>{
            const categoryOk=category==="all" || String(i.category||"").toLowerCase()===category;
            const text=`${i.name||""} ${i.description||""} ${i.category||""}`.toLowerCase();
            return categoryOk && (!query || text.includes(query));
        });

        document.getElementById("menuAdminGrid").innerHTML=rows.length
            ? rows.map(i=>`
                <article class="menu-admin-card">
                    <span class="admin-eyebrow" style="font-size:7px">${window.dosteaSafe(i.category||"MENU")}</span>
                    <h4>${window.dosteaSafe(i.name)}</h4>
                    <p>${window.dosteaSafe(i.description||"No description added.")}</p>
                    <div class="menu-admin-meta">
                        <span class="menu-admin-price">${window.dosteaMoney(i.price)}</span>
                        <span class="status-pill ${Number(i.stock_quantity||0) <= Number(i.low_stock_threshold||0) ? "status-pending" : "status-ready"}">
                            Stock: ${Number(i.stock_quantity||0)}
                        </span>
                        ${i.is_available && Number(i.stock_quantity||0) > 0
                            ? '<span class="status-pill status-ready">Available</span>'
                            : '<span class="status-pill status-cancelled">Unavailable</span>'}
                    </div>
                    <div class="table-actions" style="margin-top:12px">
                        <button class="table-action" data-edit-menu="${i.id}" type="button">Edit</button>
                        <button class="table-action" data-toggle-menu="${i.id}" data-next="${!i.is_available}" type="button">${i.is_available?"Disable":"Enable"}</button>
                    </div>
                </article>`).join("")
            : '<div class="empty-state" style="grid-column:1/-1">No menu items found.</div>';

        document.querySelectorAll("[data-edit-menu]").forEach(btn=>{
            btn.addEventListener("click",()=>openEdit(btn.dataset.editMenu));
        });

        document.querySelectorAll("[data-toggle-menu]").forEach(btn=>{
            btn.addEventListener("click",()=>toggleItem(btn.dataset.toggleMenu,btn.dataset.next==="true"));
        });
    }

    function openCreate(){
        document.getElementById("menuModalTitle").textContent="Add Item";
        document.getElementById("menuForm").reset();
        document.getElementById("menuId").value="";
        modal.classList.add("show");
        document.body.classList.add("modal-open");
    }

    function openEdit(id){
        const item = cache.find(
            i => String(i.id) === String(id)
        );
        if(!item) return;

        document.getElementById("menuModalTitle").textContent="Edit Item";
        document.getElementById("menuId").value=item.id;
        document.getElementById("menuName").value=item.name||"";
        document.getElementById("menuPrice").value=item.price||0;
        document.getElementById("menuCategory").value=String(item.category||"cafe").toLowerCase();
        document.getElementById("menuAvailable").value=String(Boolean(item.is_available));
        document.getElementById("menuStock").value=Number(item.stock_quantity||0);
        document.getElementById("menuLowStock").value=Number(item.low_stock_threshold||0);
        document.getElementById("menuDescription").value=item.description||"";
        document.getElementById("menuImageUrl").value=item.image_url||"";

        modal.classList.add("show");
        document.body.classList.add("modal-open");
    }

    function closeModal(){
        modal.classList.remove("show");
        document.body.classList.remove("modal-open");
    }

    async function toggleItem(id,value){
        const item=cache.find(row=>String(row.id)===String(id));
        if(value && Number(item?.stock_quantity||0) <= 0){
            window.dosteaToast?.("Stock Required","Add stock before enabling this item.");
            return;
        }
        const {error}=await window.supabaseClient
            .from("menu_items")
            .update({is_available:value,updated_at:new Date().toISOString()})
            .eq("id",id);

        if(error){
            window.dosteaToast?.("Menu Update Failed",error.message);
            return;
        }

        window.dosteaToast?.("Menu Updated",value?"Item is available.":"Item is unavailable.");
        loadMenu();
    }

    document.getElementById("menuForm").addEventListener("submit",async e=>{
        e.preventDefault();

        const id=document.getElementById("menuId").value;
        const menuName =
    document.getElementById("menuName").value.trim();

const stockQuantity = Math.max(0, Number(document.getElementById("menuStock").value || 0));
const payload = {
    name: menuName,

    slug: menuName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),

    price: Number(
        document.getElementById("menuPrice").value || 0
    ),

    category:
        document.getElementById("menuCategory").value,

    is_available:
        stockQuantity > 0 && document.getElementById("menuAvailable").value === "true",

    stock_quantity: stockQuantity,

    low_stock_threshold: Math.max(0, Number(document.getElementById("menuLowStock").value || 0)),

    description:
        document.getElementById("menuDescription").value.trim(),

    image_url:
        document.getElementById("menuImageUrl").value.trim() || null,

    updated_at: new Date().toISOString()
};

        let result;

        if(id){
            result=await window.supabaseClient.from("menu_items").update(payload).eq("id",id);
        } else {
            result=await window.supabaseClient.from("menu_items").insert(payload);
        }

        if(result.error){
            window.dosteaToast?.("Menu Save Failed",result.error.message);
            return;
        }

        closeModal();
        window.dosteaToast?.("Menu Saved","Menu item saved successfully.");
        loadMenu();
    });

    document.getElementById("newMenuItem").addEventListener("click",openCreate);
    document.getElementById("closeMenuModal").addEventListener("click",closeModal);
    modal.addEventListener("click",e=>{if(e.target===modal) closeModal();});

    document.querySelectorAll("#menuTabs [data-category]").forEach(btn=>{
        btn.addEventListener("click",()=>{
            document.querySelectorAll("#menuTabs .admin-tab").forEach(b=>b.classList.remove("active"));
            btn.classList.add("active");
            category=btn.dataset.category;
            render();
        });
    });

    document.getElementById("menuSearch").addEventListener("input",e=>{
        query=e.target.value.trim().toLowerCase();
        render();
    });

    window.addEventListener("dostea-admin-refresh",loadMenu);
    waitForAdmin().then(ok=>{
        if(!ok) return;
        loadMenu();
        window.supabaseClient
            .channel("dostea-admin-menu-page")
            .on("postgres_changes",{event:"*",schema:"public",table:"menu_items"},loadMenu)
            .subscribe();
    });
});
