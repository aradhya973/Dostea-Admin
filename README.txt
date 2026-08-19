DOSTEA ADMIN — USER-WEB MATCHED VERSION
=======================================

DESIGN
------
This version was rebuilt to match the DOSTEA customer website:
- #070707 / #090909 dark surfaces
- #d4af37 / #f0d778 gold system
- DM Sans + Playfair Display
- 245px fixed sidebar
- 76px topbar
- compact DOSTEA cards, borders, tabs and buttons
- same brand-mark treatment and responsive sidebar behavior

FILES
-----
admin-login.html
index.html
admin-orders.html
admin-reservations.html
admin-customers.html
admin-menu.html
admin-enquiries.html
admin-analytics.html
admin-profile.html
admin.css
admin-common.js
dashboard.js
orders.js
reservations.js
customers.js
menu.js
enquiries.js
analytics.js
profile.js
admin-login.js
admin-setup.sql
supabase.js

SETUP
-----
1. Copy the EXACT working supabase.js from your DOSTEA user website into this folder.
2. Open admin-setup.sql.
3. At the bottom of admin-setup.sql, confirm this line contains the exact
   Supabase Auth email you use for the admin login:
       where email = 'dosteaadmin@gmail.com'
4. Run the SQL in the SAME Supabase project used by:
       https://dostea.vercel.app
5. Login through admin-login.html.

CONNECTED NOW
-------------
Dashboard:
- today orders
- revenue
- pending orders
- reservation queue
- realtime order/reservation refresh

Orders:
- all user orders
- order items
- payment method
- Accept -> Preparing -> Ready -> Complete -> Cancel

Reservations:
- Confirm / Reject / Complete

Customers:
- profile data
- inferred email from orders/reservations
- order count
- reservation count
- order value

Analytics:
- total orders
- revenue
- completed orders
- reservation total
- status distribution

Admin Profile:
- display name
- role
- logout

READY BUT USER WEB NEEDS ONE MORE CONNECTION
--------------------------------------------
Menu Management:
- admin menu_items table is ready
- to make admin edits instantly change the customer menu,
  the customer menu.html must later load items from menu_items.

Enquiries:
- contact_enquiries table and admin page are ready
- the customer contact.html must later be migrated from localStorage
  to contact_enquiries.

SECURITY
--------
Never put Supabase service_role / secret key in HTML or JS.
This project uses the browser-safe publishable/anon key plus RLS/admin membership.
