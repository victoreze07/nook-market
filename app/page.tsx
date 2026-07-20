"use client";

import { useMemo, useState } from "react";

const categories = [
  ["⌁", "Electronics"], ["♧", "Collectibles"], ["♙", "Fashion"],
  ["⌂", "Home & Garden"], ["◉", "Sporting Goods"], ["◇", "Jewelry"],
  ["▱", "Motors"], ["✦", "Refurbished"],
];

const products = [
  { id: 1, category: "Electronics", title: "Apple iPhone 15 Pro · 256GB · Natural Titanium", price: 829.99, old: 999, bids: 0, time: "Buy it now", image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=800&q=85", badge: "Certified refurbished" },
  { id: 2, category: "Collectibles", title: "Pokémon Base Set Charizard 4/102 · Holo Rare", price: 310.00, bids: 21, time: "2h 14m left", image: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?auto=format&fit=crop&w=800&q=85", badge: "Authenticity guaranteed" },
  { id: 3, category: "Fashion", title: "New Balance 9060 Sea Salt · Men's 10.5", price: 114.50, bids: 7, time: "5h 42m left", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85", badge: "Top rated seller" },
  { id: 4, category: "Home & Garden", title: "Herman Miller Aeron Chair · Size B · Graphite", price: 599.00, old: 720, bids: 0, time: "Buy it now", image: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=85", badge: "Free shipping" },
  { id: 5, category: "Electronics", title: "Fujifilm X100V 26.1MP Digital Camera · Silver", price: 1450.00, bids: 18, time: "1d 3h left", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=85", badge: "Trending" },
  { id: 6, category: "Jewelry", title: "Vintage Omega Seamaster Automatic · 1968", price: 875.00, bids: 12, time: "3d 7h left", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=85", badge: "Authenticity guaranteed" },
  { id: 7, category: "Sporting Goods", title: "Callaway Paradym Driver 10.5° · Stiff", price: 289.99, old: 349, bids: 0, time: "Buy it now", image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=800&q=85", badge: "Almost gone" },
  { id: 8, category: "Collectibles", title: "LEGO Star Wars Millennium Falcon 75192 · Sealed", price: 649.00, bids: 9, time: "6h 09m left", image: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=85", badge: "Popular" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [saved, setSaved] = useState<number[]>([2]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "register" | null>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authError, setAuthError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => products.filter((p) =>
    (category === "All categories" || p.category === category) &&
    p.title.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);
  const cartLines = products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] }));
  const cartCount = cartLines.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartLines.reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 500 ? 0 : 18;
  const total = subtotal + shipping;

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  function addToCart(productId: number) {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
    setCartOpen(true);
    flash("Added to your bag");
  }

  function setQuantity(productId: number, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity < 1) delete next[productId]; else next[productId] = quantity;
      return next;
    });
  }

  async function placeOrder(formData: FormData) {
    setSubmittingOrder(true);
    try {
      const response = await fetch("http://localhost:8080/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: user?.email ?? String(formData.get("email")),
          items: cartLines.map((item) => ({ productId: String(item.id), quantity: item.quantity, price: item.price })),
          shippingAddress: {
            name: formData.get("name"),
            address: formData.get("address"),
            city: formData.get("city"),
            postalCode: formData.get("postalCode"),
          },
        }),
      });
      if (!response.ok) throw new Error("Order service unavailable");
      const order = await response.json();
      setOrderId(order.id);
      setCart({});
      setCheckoutMode(false);
    } catch {
      flash("Checkout could not connect to the order service");
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function submitAuth(formData: FormData) {
    if (!authMode) return;
    setSubmittingAuth(true);
    setAuthError("");
    try {
      const response = await fetch(`http://localhost:8080/api/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          email_already_registered: "That email is already registered. Try signing in.",
          invalid_email_or_password: "The email or password is incorrect.",
          valid_name_email_and_8_character_password_required: "Enter a name, valid email, and password of at least 8 characters.",
        };
        throw new Error(messages[result.error] ?? "Authentication failed. Please try again.");
      }
      setUser({ name: result.name, email: result.email });
      setAuthMode(null);
      flash(authMode === "register" ? "Account saved" : "Signed in");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmittingAuth(false);
    }
  }

  return (
    <main>
      {notice && <div className="toast" role="status">✓ {notice}</div>}
      {authMode && <div className="modal-backdrop" role="presentation" onMouseDown={() => setAuthMode(null)}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setAuthMode(null)} aria-label="Close">×</button><span className="kicker">NOOK ACCOUNT</span><h2 id="auth-title">{authMode === "signin" ? "Welcome back" : "Create your account"}</h2><p>{authMode === "signin" ? "Sign in to keep track of your finds." : "Save items and move through checkout faster."}</p><form action={submitAuth}>{authMode === "register" && <label>Name<input name="name" required autoComplete="name"/></label>}<label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength={8} required autoComplete={authMode === "signin" ? "current-password" : "new-password"}/></label>{authError && <p className="form-error" role="alert">{authError}</p>}<button className="primary auth-submit" type="submit" disabled={submittingAuth}>{submittingAuth ? "Please wait…" : authMode === "signin" ? "Sign in" : "Register"}</button></form><small>Your account is stored in the local PostgreSQL database. Add secure sessions and email verification before production.</small></section></div>}
      {cartOpen && <><button className="drawer-backdrop" aria-label="Close bag" onClick={() => setCartOpen(false)}/><aside className="cart-drawer" aria-label="Shopping bag"><div className="drawer-head"><div><span className="kicker">YOUR BAG</span><h2>{checkoutMode ? "Checkout" : `${cartCount} ${cartCount === 1 ? "item" : "items"}`}</h2></div><button onClick={() => setCartOpen(false)} aria-label="Close">×</button></div>{orderId ? <div className="order-success"><b>✓</b><h3>Order received</h3><p>Your demo order number is <strong>{orderId.slice(0, 8)}</strong>.</p><p>No payment was collected.</p><button onClick={() => { setOrderId(""); setCartOpen(false); }}>Continue shopping</button></div> : checkoutMode ? <form className="checkout-form" action={placeOrder}><p className="checkout-note">Shipping details</p><label>Full name<input name="name" required defaultValue={user?.name}/></label><label>Email<input name="email" type="email" required defaultValue={user?.email}/></label><label>Street address<input name="address" required/></label><div className="field-row"><label>City<input name="city" required/></label><label>Postal code<input name="postalCode" required/></label></div><div className="summary"><span>Order total</span><strong>${total.toFixed(2)}</strong></div><button className="checkout-button" disabled={submittingOrder}>{submittingOrder ? "Placing order…" : "Place demo order"}</button><button className="text-button" type="button" onClick={() => setCheckoutMode(false)}>← Back to bag</button><small>No payment is collected in this demo checkout.</small></form> : cartLines.length ? <><div className="cart-lines">{cartLines.map((item) => <article className="cart-line" key={item.id}><img src={item.image} alt=""/><div><h3>{item.title}</h3><strong>${item.price.toFixed(2)}</strong><div className="quantity"><button onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label={`Decrease ${item.title} quantity`}>−</button><span>{item.quantity}</span><button onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label={`Increase ${item.title} quantity`}>+</button><button className="remove" onClick={() => setQuantity(item.id, 0)}>Remove</button></div></div></article>)}</div><div className="cart-footer"><div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div><div><span>Shipping</span><strong>{shipping ? `$${shipping.toFixed(2)}` : "Free"}</strong></div><div className="total"><span>Total</span><strong>${total.toFixed(2)}</strong></div><button className="checkout-button" onClick={() => setCheckoutMode(true)}>Continue to checkout</button><small>Taxes calculated at the next step.</small></div></> : <div className="empty-cart"><span>◇</span><h3>Your bag is empty</h3><p>Add a find you love and it will appear here.</p><button onClick={() => setCartOpen(false)}>Keep shopping</button></div>}</aside></>}
      <div className="utility"><div className="shell utility-inner"><span>{user ? <>Hi, <button onClick={() => setAuthMode("signin")}>{user.name}</button> · <button onClick={() => { setUser(null); flash("Signed out"); }}>sign out</button></> : <>Hi! <button onClick={() => setAuthMode("signin")}>Sign in</button> or <button onClick={() => setAuthMode("register")}>register</button></>}</span><nav><button>Daily Deals</button><button>Brand Outlet</button><button>Help & Contact</button><span className="utility-spacer"/><button>Sell</button><button onClick={() => document.getElementById("trending")?.scrollIntoView({behavior:"smooth"})}>Watchlist ♡</button><button onClick={() => setAuthMode(user ? "signin" : "register")}>My Nook ▾</button><button aria-label="Notifications">♢</button><button onClick={() => setCartOpen(true)} aria-label={`Cart with ${cartCount} items`}>Bag <b>{cartCount}</b></button></nav></div></div>

      <header className="shell header">
        <a className="logo" href="#" aria-label="Nook home"><i>n</i><i>o</i><i>o</i><i>k</i><small>market</small></a>
        <button className="shop">Shop by<br/>category <span>⌄</span></button>
        <form className="search" onSubmit={(e) => { e.preventDefault(); flash(`${visible.length} matching items found`); }}>
          <span className="search-icon">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for anything" aria-label="Search products"/>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option>All categories</option>{categories.map((c) => <option key={c[1]}>{c[1]}</option>)}</select>
          <button type="submit">Search</button>
        </form>
        <button className="advanced">Advanced</button>
      </header>

      <nav className="category-nav shell"><button className="active">Home</button><button>Saved</button>{categories.slice(0,7).map((c) => <button key={c[1]} onClick={() => setCategory(c[1])}>{c[1]}</button>)}<button>Deals</button></nav>

      <section className="hero shell">
        <div className="hero-copy"><span className="eyebrow">REFURBISHED & READY</span><h1>Big finds.<br/><em>Better prices.</em></h1><p>Shop verified favorites, rare treasures, and everything in between—from sellers you can trust.</p><div><button className="primary" onClick={() => document.getElementById("trending")?.scrollIntoView({behavior:"smooth"})}>Explore deals <span>→</span></button><button className="secondary" onClick={() => flash("Selling flow coming next")}>Start selling</button></div></div>
        <div className="hero-art" aria-label="Featured marketplace finds"><div className="blob one"/><div className="blob two"/><div className="card phone"><span>LIMITED OFFER</span><b>Smartphone<br/>from $399</b><img src="https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=500&q=80" alt="Smartphone"/></div><div className="card shoe"><img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80" alt="Sneaker"/><span>Fresh kicks</span></div><div className="floating">♢ <b>Money Back<br/>Guarantee</b></div></div>
      </section>

      <section className="trust shell"><div><b>✓</b><span><strong>Money back guarantee</strong><small>Get the item you ordered or your money back.</small></span></div><div><b>⌁</b><span><strong>Fast & free shipping</strong><small>On millions of eligible items.</small></span></div><div><b>♢</b><span><strong>Authenticity guaranteed</strong><small>Experts inspect before it ships.</small></span></div><div><b>♙</b><span><strong>24/7 support</strong><small>We&apos;re here whenever you need us.</small></span></div></section>

      <section className="shell section"><div className="section-head"><div><span className="kicker">EXPLORE THE MARKETPLACE</span><h2>Shop by category</h2></div><button>See all categories →</button></div><div className="category-grid">{categories.map((c, i) => <button key={c[1]} onClick={() => { setCategory(c[1]); document.getElementById("trending")?.scrollIntoView({behavior:"smooth"}); }}><span className={`cat-icon c${i}`}>{c[0]}</span><strong>{c[1]}</strong><small>{["2.4M+ items","850K+ items","1.8M+ items","3.1M+ items","720K+ items","640K+ items","1.2M+ items","410K+ items"][i]}</small></button>)}</div></section>

      <section className="shell section" id="trending"><div className="section-head"><div><span className="kicker">HANDPICKED FOR YOU</span><h2>{category === "All categories" ? "Trending right now" : category}</h2></div><div className="arrows"><button aria-label="Previous">←</button><button aria-label="Next">→</button></div></div>
        <div className="product-grid">{visible.map((p) => <article className="product" key={p.id}><div className="product-image"><img src={p.image} alt=""/><button className={saved.includes(p.id) ? "heart saved" : "heart"} aria-label="Save item" onClick={() => setSaved(saved.includes(p.id) ? saved.filter(id => id !== p.id) : [...saved,p.id])}>♥</button><span>{p.badge}</span></div><div className="product-body"><h3>{p.title}</h3><div className="price"><strong>${p.price.toLocaleString(undefined,{minimumFractionDigits:2})}</strong>{p.old && <del>${p.old}</del>}</div><p>{p.bids ? `${p.bids} bids · ${p.time}` : p.time}</p><small>+ shipping calculated at checkout</small><button onClick={() => addToCart(p.id)}>Add to bag</button></div></article>)}</div>
        {visible.length === 0 && <div className="empty"><b>No treasures found yet.</b><span>Try another search or browse all categories.</span><button onClick={() => {setQuery("");setCategory("All categories");}}>Clear filters</button></div>}
      </section>

      <section className="shell sell-banner"><div><span className="kicker">YOUR STUFF HAS VALUE</span><h2>List it. Sell it. Love the space.</h2><p>Millions of buyers are looking for exactly what you have. List your first item in minutes.</p><button onClick={() => flash("Seller onboarding coming next")}>Start selling →</button></div><div className="sell-art"><div className="tag">SOLD<span>$165</span></div><div className="package">nook<small>♻ ship happy</small></div><div className="spark">✦</div></div></section>

      <footer><div className="shell footer-grid"><div><a className="logo footer-logo" href="#"><i>n</i><i>o</i><i>o</i><i>k</i></a><p>Find what you love.<br/>Sell what you don&apos;t.</p></div>{[["Buy","Registration","Nook Money Back Guarantee","Bidding & buying help","Stores"],["Sell","Start selling","Seller Center","Affiliates","How to sell"],["About","Company info","News","Investors","Careers"],["Help","Help & Contact","Community","Security center","Accessibility"]].map(g => <div key={g[0]}><strong>{g[0]}</strong>{g.slice(1).map(x => <button key={x}>{x}</button>)}</div>)}</div><div className="shell copyright">© 2026 Nook Market. All rights reserved. <span>Privacy · Terms · Cookies</span></div></footer>
    </main>
  );
}
