// src/pages/Storefront.tsx
// ══════════════════════════════════════════════════════════════
//  PRO STOREFRONT — Amazon/Noon level  |  RTL Arabic  |  v3
// ══════════════════════════════════════════════════════════════
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ShoppingCart, Plus, Minus, X, Search, LayoutGrid, List,
  MapPin, Truck, Star, Heart, Package, Shield, RefreshCw,
  Phone, Clock, Tag, Flame, CheckCircle, AlertCircle,
  Navigation, Home, Building2, CreditCard, ArrowLeft, ChevronLeft,
} from 'lucide-react';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string; name: string; price: number; original_price?: number;
  quantity: number; reserved_quantity?: number; availableQuantity?: number;
  image_url?: string; description?: string; category?: string;
  rating?: number; review_count?: number; variants?: Variant[];
}
interface Variant {
  id: string; title: string; attributes: Record<string, string>;
  price: number; quantity: number; sku?: string; image_url?: string;
}
interface CartItem {
  productId: string; variantId: string | null;
  productName: string; price: number; quantity: number;
  isReservation: boolean; attributes?: Record<string, string>;
  imageUrl?: string;
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
:root{
  --cp:#F0A500;--cpd:#D4920A;--cpl:#FFF8E7;
  --cs:#1A1A2E;--csd:#0D0D1F;
  --ca:#E63946;--cal:#FFEBEC;
  --cg:#2D9653;--cgl:#E6F5EC;
  --cb:#1565C0;--cbl:#E3F2FD;
  --cbg:#F4F6F8;--csu:#FFF;--csu2:#FAFBFC;
  --ct:#0D1B2A;--ct2:#4A5568;--ct3:#9AA5B4;
  --cbr:#E2E8F0;--cbr2:#CBD5E0;
  --s1:0 1px 3px rgba(0,0,0,.08);
  --s2:0 4px 16px rgba(0,0,0,.10);
  --s3:0 8px 32px rgba(0,0,0,.12);
  --s4:0 20px 60px rgba(0,0,0,.16);
  --r:8px;--r2:12px;--r3:16px;--r4:24px;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
.sf{font-family:'Tajawal',sans-serif;background:var(--cbg);color:var(--ct);direction:rtl;min-height:100vh}
button,input,select,textarea{font-family:'Tajawal',sans-serif}
.sf-topbar{background:var(--csd);padding:7px 0}
.sf-tbi{max-width:1480px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.sf-ti{display:flex;align-items:center;gap:5px;color:rgba(255,255,255,.55);font-size:12px;cursor:pointer;transition:.15s;white-space:nowrap}
.sf-ti:hover{color:var(--cp)}
.sf-tdiv{width:1px;height:12px;background:rgba(255,255,255,.12)}
.sf-header{background:var(--cs);box-shadow:0 2px 12px rgba(0,0,0,.3);position:sticky;top:0;z-index:300}
.sf-hi{max-width:1480px;margin:0 auto;padding:0 20px;height:72px;display:flex;align-items:center;gap:16px}
.sf-logo{display:flex;align-items:center;gap:10px;flex-shrink:0}
.sf-logo-img{width:44px;height:44px;border-radius:10px;object-fit:cover}
.sf-logo-ph{width:44px;height:44px;border-radius:10px;background:var(--cp);display:flex;align-items:center;justify-content:center;font-size:22px}
.sf-sname{font-size:19px;font-weight:800;color:#fff;letter-spacing:-.4px}
.sf-sb{flex:1;max-width:580px;display:flex;border-radius:var(--r2);overflow:hidden;transition:.2s}
.sf-sb:focus-within{box-shadow:0 0 0 2px var(--cp)}
.sf-si{flex:1;height:46px;padding:0 18px;border:none;background:#fff;font-size:14px;outline:none;color:var(--ct)}
.sf-si::placeholder{color:var(--ct3)}
.sf-sbtn{width:54px;height:46px;background:var(--cp);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--csd);transition:.15s;flex-shrink:0}
.sf-sbtn:hover{background:var(--cpd)}
.sf-ha{display:flex;align-items:center;gap:8px;flex-shrink:0}
.sf-ib{width:44px;height:44px;border-radius:var(--r2);background:rgba(255,255,255,.08);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;position:relative}
.sf-ib:hover{background:rgba(255,255,255,.15)}
.sf-bdg{position:absolute;top:-4px;left:-4px;min-width:18px;height:18px;border-radius:100px;background:var(--ca);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--cs)}
.sf-cbtn{display:flex;align-items:center;gap:8px;background:var(--cp);color:var(--csd);border:none;border-radius:var(--r2);padding:10px 18px;cursor:pointer;font-size:14px;font-weight:800;transition:.2s;white-space:nowrap;box-shadow:0 4px 14px rgba(240,165,0,.4)}
.sf-cbtn:hover{background:var(--cpd);transform:translateY(-1px)}
.sf-navbar{background:var(--csd);border-top:1px solid rgba(255,255,255,.06)}
.sf-nbi{max-width:1480px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:4px;overflow-x:auto;scrollbar-width:none}
.sf-nbi::-webkit-scrollbar{display:none}
.sf-ni{padding:10px 16px;color:rgba(255,255,255,.65);font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:.15s;border:none;background:transparent}
.sf-ni:hover{color:#fff;background:rgba(255,255,255,.06);border-radius:var(--r) var(--r) 0 0}
.sf-ni.on{color:var(--cp);border-bottom:2px solid var(--cp)}
.sf-deal{background:linear-gradient(90deg,#E63946,#FF6B6B);padding:11px 20px}
.sf-di{max-width:1480px;margin:0 auto;display:flex;align-items:center;gap:14px}
.sf-dlbl{background:#fff;color:#E63946;font-size:11px;font-weight:800;padding:3px 10px;border-radius:100px;white-space:nowrap;flex-shrink:0}
.sf-dtxt{color:#fff;font-size:13px;font-weight:600;flex:1}
.sf-dtmr{display:flex;gap:5px;align-items:center;flex-shrink:0}
.sf-tb{background:rgba(0,0,0,.25);color:#fff;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:800;min-width:36px;text-align:center}
.sf-ts{color:rgba(255,255,255,.7);font-weight:800}
.sf-hero{background:linear-gradient(135deg,var(--csd) 0%,#16213E 60%,#0F3460 100%);padding:52px 20px;position:relative;overflow:hidden}
.sf-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 800px 400px at 50% 140%,rgba(240,165,0,.15) 0%,transparent 65%)}
.sf-heri{max-width:1480px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:36px;position:relative}
.sf-hertxt{color:#fff}
.sf-herbadge{display:inline-flex;align-items:center;gap:6px;background:rgba(240,165,0,.15);border:1px solid rgba(240,165,0,.3);color:var(--cp);padding:5px 14px;border-radius:100px;font-size:12px;font-weight:700;margin-bottom:16px}
.sf-hertitle{font-size:clamp(26px,3.5vw,44px);font-weight:900;line-height:1.15;letter-spacing:-1px;margin-bottom:12px}
.sf-hersub{font-size:16px;opacity:.7;margin-bottom:24px;line-height:1.6}
.sf-herchips{display:flex;gap:10px;flex-wrap:wrap}
.sf-hchip{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);padding:6px 14px;border-radius:100px;font-size:12px;font-weight:500}
.sf-herstats{display:flex;gap:20px;flex-shrink:0}
.sf-hsc{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:var(--r3);padding:18px 22px;text-align:center;color:#fff;min-width:90px}
.sf-hsn{font-size:26px;font-weight:900;color:var(--cp)}
.sf-hsl{font-size:12px;opacity:.6;margin-top:4px}
.sf-layout{max-width:1480px;margin:24px auto;padding:0 20px;display:grid;grid-template-columns:256px 1fr;gap:22px}
.sf-sidebar{display:flex;flex-direction:column;gap:16px}
.sf-sbc{background:var(--csu);border-radius:var(--r3);border:1px solid var(--cbr);box-shadow:var(--s1);overflow:hidden}
.sf-sbh{padding:13px 18px;font-size:12px;font-weight:800;color:var(--ct);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--cbr);background:var(--csu2);display:flex;align-items:center;gap:8px}
.sf-sbh svg{color:var(--cp)}
.sf-cati{display:flex;align-items:center;justify-content:space-between;padding:11px 18px;cursor:pointer;border-bottom:1px solid var(--cbr);transition:.15s;border:none;background:transparent;width:100%;text-align:right}
.sf-cati:last-child{border-bottom:none}
.sf-cati:hover{background:var(--cpl)}
.sf-cati.on{background:var(--cpl);border-right:3px solid var(--cp)}
.sf-catn{font-size:14px;font-weight:500;color:var(--ct)}
.sf-cati.on .sf-catn{font-weight:700;color:var(--cpd)}
.sf-catc{font-size:11px;background:var(--cbr);padding:2px 8px;border-radius:100px;color:var(--ct2)}
.sf-fb{padding:16px 18px;display:flex;flex-direction:column;gap:15px}
.sf-ft{font-size:12px;font-weight:700;color:var(--ct2);display:flex;justify-content:space-between}
.sf-fv{color:var(--cpd);font-weight:800}
.sf-range{width:100%;accent-color:var(--cp);cursor:pointer}
.sf-ck{display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 0}
.sf-ck input{width:15px;height:15px;accent-color:var(--cp);cursor:pointer}
.sf-ck span{font-size:13px;font-weight:500}
.sf-toolbar{background:var(--csu);border-radius:var(--r3);border:1px solid var(--cbr);box-shadow:var(--s1);padding:13px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap}
.sf-tbl{display:flex;align-items:center;gap:10px}
.sf-sel{height:38px;padding:0 13px;border:1.5px solid var(--cbr);border-radius:var(--r);background:#fff;font-size:13px;color:var(--ct);outline:none;cursor:pointer;transition:.15s}
.sf-sel:focus{border-color:var(--cp)}
.sf-vg{display:flex;gap:3px}
.sf-vb{width:36px;height:36px;border-radius:var(--r);border:1.5px solid var(--cbr);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ct3);transition:.15s}
.sf-vb.on{background:var(--cs);border-color:var(--cs);color:#fff}
.sf-rcount{font-size:13px;color:var(--ct2);font-weight:500}
.sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(218px,1fr));gap:16px}
.sf-card{background:var(--csu);border-radius:var(--r3);border:1px solid var(--cbr);overflow:hidden;box-shadow:var(--s1);transition:box-shadow .25s,transform .25s;display:flex;flex-direction:column;cursor:pointer}
.sf-card:hover{box-shadow:var(--s3);transform:translateY(-4px)}
.sf-ciw{position:relative;padding-top:80%;background:var(--cbg);overflow:hidden}
.sf-ciw img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .4s}
.sf-card:hover .sf-ciw img{transform:scale(1.05)}
.sf-ciph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:50px;color:var(--ct3)}
.sf-cbadges{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:5px}
.sf-pill{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.sf-pill-sale{background:var(--ca);color:#fff}
.sf-pill-hot{background:#FF6B35;color:#fff}
.sf-pill-new{background:var(--cg);color:#fff}
.sf-wish{position:absolute;top:10px;left:10px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s;box-shadow:var(--s1)}
.sf-wish:hover{background:#fff;transform:scale(1.1)}
.sf-out-ov{position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}
.sf-out-p{background:#fff;padding:6px 18px;border-radius:100px;font-size:13px;font-weight:800;color:var(--ca)}
.sf-cbody{padding:13px 13px 9px;flex:1;display:flex;flex-direction:column;gap:7px}
.sf-ccat{font-size:11px;font-weight:600;color:var(--cb);background:var(--cbl);padding:2px 8px;border-radius:100px;display:inline-block;align-self:flex-start}
.sf-cname{font-size:14px;font-weight:700;color:var(--ct);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sf-crat{display:flex;align-items:center;gap:5px}
.sf-crat-n{font-size:12px;font-weight:700}
.sf-crat-c{font-size:11px;color:var(--ct3)}
.sf-cfoot{padding:9px 13px 13px;border-top:1px solid var(--cbr);display:flex;align-items:center;justify-content:space-between;gap:8px}
.sf-pr{font-size:18px;font-weight:900}
.sf-pr-u{font-size:12px;font-weight:500;color:var(--ct2)}
.sf-pr-o{font-size:12px;color:var(--ct3);text-decoration:line-through;display:block}
.sf-pr-s{font-size:11px;color:var(--cg);font-weight:600}
.sf-atc{display:flex;align-items:center;gap:5px;background:var(--cp);color:var(--csd);border:none;border-radius:100px;padding:8px 13px;cursor:pointer;font-size:12px;font-weight:800;transition:.2s;white-space:nowrap;box-shadow:0 3px 10px rgba(240,165,0,.35)}
.sf-atc:hover{background:var(--cpd);transform:translateY(-1px)}
.sf-atc:disabled{background:var(--cbg);color:var(--ct3);box-shadow:none;cursor:default;transform:none}
.sf-lv{display:flex;flex-direction:column;gap:13px}
.sf-lc{background:var(--csu);border-radius:var(--r3);border:1px solid var(--cbr);box-shadow:var(--s1);display:flex;overflow:hidden;transition:box-shadow .2s;cursor:pointer}
.sf-lc:hover{box-shadow:var(--s2)}
.sf-li{width:175px;flex-shrink:0;background:var(--cbg);position:relative;overflow:hidden}
.sf-li img{width:100%;height:100%;object-fit:cover;min-height:155px;transition:transform .4s}
.sf-lc:hover .sf-li img{transform:scale(1.04)}
.sf-liph{width:100%;min-height:155px;display:flex;align-items:center;justify-content:center;font-size:44px;color:var(--ct3)}
.sf-lb{flex:1;padding:16px 18px;display:flex;justify-content:space-between;gap:14px}
.sf-linfo{flex:1;display:flex;flex-direction:column;gap:7px}
.sf-ldesc{font-size:13px;color:var(--ct2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sf-lact{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;flex-shrink:0}
.sf-ldel{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--cg);font-weight:600;margin-top:4px}
.sf-det-bd{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:450;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px)}
@media(min-width:700px){.sf-det-bd{align-items:center}}
.sf-det-sh{background:var(--csu);width:100%;max-width:860px;max-height:92vh;border-radius:24px 24px 0 0;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--s4)}
@media(min-width:700px){.sf-det-sh{border-radius:20px;max-height:86vh}}
.sf-det-hd{padding:15px 20px;border-bottom:1px solid var(--cbr);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.sf-det-ht{font-size:16px;font-weight:800}
.sf-det-cl{width:36px;height:36px;border-radius:50%;background:var(--cbg);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}
.sf-det-cl:hover{background:var(--cal);color:var(--ca)}
.sf-det-body{flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:0}
@media(max-width:680px){.sf-det-body{grid-template-columns:1fr}}
.sf-det-img{background:var(--cbg);position:relative;min-height:300px}
.sf-det-img img{width:100%;height:100%;object-fit:cover;min-height:300px}
.sf-det-imgph{width:100%;height:300px;display:flex;align-items:center;justify-content:center;font-size:72px}
.sf-det-info{padding:22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto}
.sf-det-name{font-size:20px;font-weight:900;line-height:1.3}
.sf-det-pr{display:flex;align-items:baseline;gap:10px}
.sf-det-pr-curr{font-size:28px;font-weight:900}
.sf-det-pr-orig{font-size:16px;color:var(--ct3);text-decoration:line-through}
.sf-det-save{background:var(--cal);color:var(--ca);font-size:12px;font-weight:800;padding:3px 10px;border-radius:100px}
.sf-det-stock{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.sf-in-stk{color:var(--cg)}
.sf-no-stk{color:var(--ca)}
.sf-dvars{display:flex;flex-direction:column;gap:9px}
.sf-dvlbl{font-size:13px;font-weight:700}
.sf-dvopts{display:flex;gap:7px;flex-wrap:wrap}
.sf-dvbtn{padding:6px 14px;border-radius:var(--r);border:2px solid var(--cbr);background:#fff;font-size:13px;font-weight:600;color:var(--ct2);cursor:pointer;transition:.15s}
.sf-dvbtn.on{border-color:var(--cp);background:var(--cpl);color:var(--cpd)}
.sf-qrow{display:flex;align-items:center;gap:12px}
.sf-qctrl{display:flex;align-items:center;gap:8px;background:var(--cbg);border-radius:var(--r4);padding:4px}
.sf-qbtn{width:32px;height:32px;border-radius:50%;border:none;background:var(--csu);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--s1);transition:.15s;color:var(--ct)}
.sf-qbtn:hover{background:var(--cp);color:var(--csd)}
.sf-qnum{font-size:16px;font-weight:800;min-width:28px;text-align:center}
.sf-det-addbtn{flex:1;padding:13px;background:var(--cp);color:var(--csd);border:none;border-radius:100px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(240,165,0,.4);transition:.2s}
.sf-det-addbtn:hover{background:var(--cpd);transform:translateY(-1px)}
.sf-det-addbtn:disabled{background:var(--cbg);color:var(--ct3);box-shadow:none;cursor:default;transform:none}
.sf-det-desc{font-size:13px;color:var(--ct2);line-height:1.7;border-top:1px solid var(--cbr);padding-top:13px}
.sf-perks{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid var(--cbr);padding-top:13px}
.sf-perk{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ct2)}
.sf-perk svg{color:var(--cg);flex-shrink:0}
.sf-cart-bd{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:flex;justify-content:flex-end;backdrop-filter:blur(2px)}
.sf-cart-dr{width:100%;max-width:480px;background:var(--csu);height:100vh;display:flex;flex-direction:column;box-shadow:-8px 0 48px rgba(0,0,0,.2)}
.sf-cart-hd{background:var(--cs);padding:18px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.sf-cart-hdtit{font-size:17px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px}
.sf-cart-hdc{background:var(--cp);color:var(--csd);width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
.sf-cart-x{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}
.sf-cart-x:hover{background:rgba(255,255,255,.2)}
.sf-steps{display:flex;border-bottom:1px solid var(--cbr);background:var(--csu2);flex-shrink:0}
.sf-step{flex:1;padding:11px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;transition:.15s;border-bottom:2px solid transparent}
.sf-step.done{border-bottom-color:var(--cg)}
.sf-step.active{border-bottom-color:var(--cp)}
.sf-snum{width:24px;height:24px;border-radius:50%;border:2px solid var(--cbr);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--ct3);transition:.15s}
.sf-step.active .sf-snum{border-color:var(--cp);background:var(--cp);color:var(--csd)}
.sf-step.done .sf-snum{border-color:var(--cg);background:var(--cg);color:#fff}
.sf-slbl{font-size:11px;font-weight:600;color:var(--ct3)}
.sf-step.active .sf-slbl,.sf-step.done .sf-slbl{color:var(--ct)}
.sf-cart-body{flex:1;overflow-y:auto;padding:18px 22px}
.sf-ci{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--cbr)}
.sf-ci:last-child{border-bottom:none}
.sf-cithumb{width:72px;height:72px;border-radius:var(--r2);background:var(--cbg);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:26px}
.sf-cithumb img{width:100%;height:100%;object-fit:cover}
.sf-ciinfo{flex:1}
.sf-ciname{font-size:13px;font-weight:700;line-height:1.4;margin-bottom:3px}
.sf-ciattrs{font-size:11px;color:var(--ct3);margin-bottom:6px}
.sf-ciprice{font-size:15px;font-weight:900;color:var(--ct)}
.sf-cibottom{display:flex;align-items:center;gap:8px;margin-top:8px}
.sf-ciqty{display:flex;align-items:center;gap:6px;background:var(--cbg);border-radius:100px;padding:3px 6px}
.sf-ciqb{width:24px;height:24px;border-radius:50%;border:none;background:var(--csu);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--s1);color:var(--ct);transition:.15s}
.sf-ciqb:hover{background:var(--cp);color:var(--csd)}
.sf-ciqn{font-size:13px;font-weight:800;min-width:20px;text-align:center}
.sf-cidel{background:none;border:none;color:var(--ct3);cursor:pointer;font-size:12px;transition:.15s;margin-right:auto}
.sf-cidel:hover{color:var(--ca)}
.sf-asec{margin-bottom:18px}
.sf-asec-t{font-size:13px;font-weight:800;color:var(--ct);margin-bottom:11px;display:flex;align-items:center;gap:7px}
.sf-atrow{display:flex;gap:8px;margin-bottom:13px}
.sf-at{flex:1;padding:10px;border:2px solid var(--cbr);border-radius:var(--r2);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:.15s;background:#fff}
.sf-at:hover{border-color:var(--cpd)}
.sf-at.on{border-color:var(--cp);background:var(--cpl)}
.sf-at svg{color:var(--ct2)}
.sf-at.on svg{color:var(--cpd)}
.sf-atlbl{font-size:11px;font-weight:700}
.sf-input{width:100%;padding:11px 14px;border:1.5px solid var(--cbr);border-radius:var(--r2);font-size:14px;color:var(--ct);outline:none;transition:.2s;background:#fff;margin-bottom:10px}
.sf-input:focus{border-color:var(--cp);box-shadow:0 0 0 3px rgba(240,165,0,.12)}
.sf-input::placeholder{color:var(--ct3)}
textarea.sf-input{resize:vertical;min-height:64px}
.sf-map-ph{width:100%;height:195px;border-radius:var(--r2);border:2px dashed var(--cbr);background:var(--cbg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:.2s;margin-bottom:10px}
.sf-map-ph:hover{border-color:var(--cp);background:var(--cpl)}
.sf-map-ph svg{color:var(--cp)}
.sf-map-ph p{font-size:13px;font-weight:600;color:var(--ct2)}
.sf-map-ph span{font-size:11px;color:var(--ct3)}
.sf-map-act{width:100%;height:195px;border-radius:var(--r2);overflow:hidden;position:relative;margin-bottom:8px;border:2px solid var(--cp)}
.sf-map-frm{width:100%;height:100%;border:none}
.sf-map-coords{font-size:11px;color:var(--cg);font-weight:600;display:flex;align-items:center;gap:5px;margin-bottom:10px}
.sf-dopts{display:flex;flex-direction:column;gap:7px;margin-bottom:13px}
.sf-dopt{border:2px solid var(--cbr);border-radius:var(--r2);padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:11px;transition:.15s;background:#fff}
.sf-dopt:hover{border-color:var(--cpd)}
.sf-dopt.on{border-color:var(--cp);background:var(--cpl)}
.sf-dopt-ic{width:40px;height:40px;border-radius:var(--r);background:var(--cbg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.sf-dopt.on .sf-dopt-ic{background:rgba(240,165,0,.18)}
.sf-dopt-info{flex:1}
.sf-dopt-t{font-size:14px;font-weight:700}
.sf-dopt-s{font-size:12px;color:var(--ct3);margin-top:2px}
.sf-dopt-p{font-size:14px;font-weight:800;color:var(--cg)}
.sf-payms{display:flex;flex-direction:column;gap:8px;margin-bottom:15px}
.sf-paym{border:2px solid var(--cbr);border-radius:var(--r2);padding:13px 15px;cursor:pointer;display:flex;align-items:center;gap:11px;transition:.15s;background:#fff}
.sf-paym:hover{border-color:var(--cpd)}
.sf-paym.on{border-color:var(--cp);background:var(--cpl)}
.sf-payic{width:44px;height:44px;border-radius:var(--r);display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--cbg);flex-shrink:0}
.sf-paym.on .sf-payic{background:rgba(240,165,0,.18)}
.sf-payinfo{flex:1}
.sf-payt{font-size:14px;font-weight:700}
.sf-pays{font-size:12px;color:var(--ct3);margin-top:2px}
.sf-payb{font-size:11px;background:var(--cgl);color:var(--cg);padding:2px 8px;border-radius:100px;font-weight:600}
.sf-osum{background:var(--csu2);border-radius:var(--r2);border:1px solid var(--cbr);padding:15px;margin-bottom:14px}
.sf-sr{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px}
.sf-sr.total{font-size:16px;font-weight:800;border-top:1px solid var(--cbr);padding-top:9px;margin-top:4px}
.sf-sl{color:var(--ct2)}
.sf-sv{font-weight:600;color:var(--ct)}
.sf-sr.total .sf-sv{font-size:20px}
.sf-sr.save .sf-sv{color:var(--cg)}
.sf-cart-foot{padding:15px 22px;border-top:1px solid var(--cbr);background:var(--csu2);flex-shrink:0}
.sf-cnext{width:100%;padding:13px;background:var(--cp);color:var(--csd);border:none;border-radius:100px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 5px 18px rgba(240,165,0,.4);transition:.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.sf-cnext:hover{background:var(--cpd);transform:translateY(-1px)}
.sf-cnext:disabled{opacity:.45;cursor:default;transform:none}
.sf-cwa{width:100%;padding:13px;background:linear-gradient(135deg,#25d366,#128C7E);color:#fff;border:none;border-radius:100px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 5px 18px rgba(37,211,102,.4);transition:.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.sf-cwa:hover{transform:translateY(-1px)}
.sf-cwa:disabled{opacity:.5;cursor:default;transform:none}
.sf-cback{width:100%;padding:11px;background:transparent;border:1.5px solid var(--cbr);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px;color:var(--ct2);transition:.15s;display:flex;align-items:center;justify-content:center;gap:6px}
.sf-cback:hover{background:var(--cbg)}
.sf-succ{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 22px;text-align:center;gap:13px;min-height:300px}
.sf-succ-ring{width:84px;height:84px;border-radius:50%;background:var(--cgl);display:flex;align-items:center;justify-content:center;animation:pop .4s ease}
@keyframes pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
.sf-succ-t{font-size:22px;font-weight:900}
.sf-succ-s{font-size:14px;color:var(--ct2);max-width:270px;line-height:1.6}
.sf-succ-oid{background:var(--cgl);border:1px solid rgba(45,150,83,.2);border-radius:var(--r2);padding:10px 20px;font-size:14px;font-weight:700;color:var(--cg)}
.sf-cont{padding:12px 30px;background:var(--cs);color:#fff;border:none;border-radius:100px;font-size:14px;font-weight:700;cursor:pointer;margin-top:6px;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:.2s}
.sf-cont:hover{background:var(--csd);transform:translateY(-1px)}
.sf-empty-cart{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;padding:60px 20px;text-align:center}
.sf-eci{font-size:52px}
.sf-ect{font-size:17px;font-weight:800}
.sf-ecs{font-size:13px;color:var(--ct2)}
.sf-empty-st{background:var(--csu);border-radius:var(--r3);border:1px solid var(--cbr);padding:72px 20px;text-align:center}
.sf-empi{font-size:52px;margin-bottom:14px}
.sf-empt{font-size:18px;font-weight:700;margin-bottom:7px}
.sf-emps{font-size:14px;color:var(--ct2)}
.sf-loading{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--cbg)}
.sf-spinner{width:50px;height:50px;border:4px solid var(--cbr);border-top-color:var(--cp);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sf-loading p{font-size:15px;color:var(--ct2);font-family:'Tajawal',sans-serif}
.sf-err{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--cbg);text-align:center;padding:24px;font-family:'Tajawal',sans-serif}
@media(max-width:1024px){.sf-layout{grid-template-columns:220px 1fr}.sf-herstats{display:none}}
@media(max-width:768px){.sf-layout{grid-template-columns:1fr}.sf-sidebar{display:none}.sf-topbar{display:none}.sf-grid{grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:11px}.sf-li{width:115px}}
@media(max-width:480px){.sf-hi{padding:0 12px;gap:10px}.sf-sname{display:none}.sf-sb{max-width:none}.sf-hero{padding:34px 14px}.sf-grid{grid-template-columns:repeat(2,1fr);gap:9px}}
`;

if (!document.getElementById('sf-v3')) {
  const el = document.createElement('style');
  el.id = 'sf-v3'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const Stars = ({ r = 0, sz = 13 }: { r?: number; sz?: number }) => (
  <div style={{ display: 'flex', gap: 1 }}>
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={sz} fill={i<=Math.round(r)?'#F0A500':'none'} stroke={i<=Math.round(r)?'#F0A500':'#CBD5E0'} />
    ))}
  </div>
);
const fmt = (n: number) => n.toLocaleString('ar-SA');

export default function Storefront() {
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [maxPrice, setMaxPrice] = useState(10000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [imgErrs, setImgErrs] = useState<Set<string>>(new Set());
  const [selVars, setSelVars] = useState<Record<string,string>>({});
  const [detailP, setDetailP] = useState<Product|null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState<0|1|2|3>(0);
  const [customer, setCustomer] = useState({ name:'', phone:'' });
  const [addrType, setAddrType] = useState<'home'|'work'|'other'>('home');
  const [addr, setAddr] = useState({ street:'', district:'', city:'الرياض', details:'' });
  const [delivery, setDelivery] = useState<'standard'|'express'|'pickup'>('standard');
  const [payment, setPayment] = useState<'cash'|'card'|'transfer'|'wallet'>('cash');
  const [mapActive, setMapActive] = useState(false);
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [timer, setTimer] = useState({h:5,m:42,s:30});

  useEffect(() => {
    const t = setInterval(() => setTimer(p => {
      let {h,m,s}=p; s--; if(s<0){s=59;m--;} if(m<0){m=59;h--;} if(h<0){h=23;m=59;s=59;}
      return {h,m,s};
    }),1000);
    return ()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    if(!slug)return;
    fetch(`${BACKEND}/api/public/stores/${slug}`).then(r=>r.json()).then(d=>{
      if(d.products) d.products=d.products.map((p:any)=>({...p,availableQuantity:p.quantity-(p.reserved_quantity||0)}));
      setStore(d);setLoading(false);
    }).catch(()=>setLoading(false));
  },[slug]);

  const products:Product[] = useMemo(()=>{
    if(!store?.products)return[];
    return store.products.map((p:any)=>({...p,availableQuantity:p.quantity-(p.reserved_quantity||0)}));
  },[store]);

  const categories = useMemo(()=>['الكل',...Array.from(new Set(products.map(p=>p.category).filter(Boolean)))] as string[],[products]);
  const topPrice = useMemo(()=>Math.max(...products.map(p=>p.price),1000),[products]);
  useEffect(()=>setMaxPrice(topPrice),[topPrice]);

  const filtered = useMemo(()=>{
    let l=[...products];
    if(category!=='الكل') l=l.filter(p=>p.category===category);
    if(search.trim()) l=l.filter(p=>p.name.includes(search)||p.description?.includes(search));
    if(onlyInStock) l=l.filter(p=>(p.availableQuantity??p.quantity)>0);
    if(minRating>0) l=l.filter(p=>(p.rating||0)>=minRating);
    l=l.filter(p=>p.price<=maxPrice);
    if(sortBy==='price-asc') l.sort((a,b)=>a.price-b.price);
    else if(sortBy==='price-desc') l.sort((a,b)=>b.price-a.price);
    else if(sortBy==='rating') l.sort((a,b)=>(b.rating||0)-(a.rating||0));
    else if(sortBy==='name') l.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortBy==='newest') l.reverse();
    return l;
  },[products,category,search,sortBy,maxPrice,onlyInStock,minRating]);

  const totalItems = useMemo(()=>cart.reduce((s,i)=>s+i.quantity,0),[cart]);
  const subtotal = useMemo(()=>cart.reduce((s,i)=>s+i.price*i.quantity,0),[cart]);
  const delCost = useMemo(()=>delivery==='express'?25:delivery==='standard'?10:0,[delivery]);
  const totalPrice = subtotal+delCost;
  const totalSaved = useMemo(()=>cart.reduce((s,i)=>{
    const p=products.find(pr=>pr.id===i.productId);
    return p?.original_price?s+(p.original_price-p.price)*i.quantity:s;
  },0),[cart,products]);

  const getVI = (p:Product)=>{
    if(!p.variants?.length) return{price:p.price,available:p.availableQuantity??p.quantity,variantId:null};
    const v=p.variants.find(v=>v.id===selVars[p.id])??p.variants[0];
    return{price:v.price,available:v.quantity,variantId:v.id};
  };

  const addToCart = useCallback((p:Product,qty=1)=>{
    const{price,available,variantId}=getVI(p);
    if(available<=0)return;
    setCart(prev=>{
      const idx=prev.findIndex(i=>i.productId===p.id&&i.variantId===variantId);
      if(idx!==-1){const u=[...prev];u[idx]={...u[idx],quantity:u[idx].quantity+qty};return u;}
      const v=p.variants?.find(v=>v.id===variantId);
      return[...prev,{productId:p.id,variantId,productName:p.name,price,quantity:qty,isReservation:false,attributes:v?.attributes,imageUrl:p.image_url}];
    });
    setShowCart(true);
  },[selVars]);

  const updQty=(pid:string,vid:string|null,d:number)=>setCart(p=>p.map(i=>i.productId!==pid||i.variantId!==vid?i:i.quantity+d<=0?null:{...i,quantity:i.quantity+d}).filter(Boolean) as CartItem[]);
  const removeCI=(pid:string,vid:string|null)=>setCart(p=>p.filter(i=>!(i.productId===pid&&i.variantId===vid)));

  const getLocation=()=>{
    if(!navigator.geolocation)return alert('المتصفح لا يدعم تحديد الموقع');
    navigator.geolocation.getCurrentPosition(pos=>{setCoords({lat:pos.coords.latitude,lng:pos.coords.longitude});setMapActive(true);},()=>alert('تعذّر الحصول على الموقع'));
  };

  const submitOrder=async()=>{
    if(!customer.name.trim()||!customer.phone.trim())return alert('يرجى ملء الاسم ورقم الجوال');
    setSubmitting(true);
    const pl:Record<string,string>={cash:'كاش عند الاستلام',card:'بطاقة',transfer:'تحويل بنكي',wallet:'محفظة إلكترونية'};
    const dl:Record<string,string>={standard:'توصيل عادي',express:'توصيل سريع',pickup:'استلام من المتجر'};
    try{
      const res=await fetch(`${BACKEND}/api/public/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        storeId:store.id,customerName:customer.name,customerPhone:customer.phone,
        items:cart.map(i=>({productId:i.productId,variantId:i.variantId,productName:i.productName+(i.attributes?` (${Object.values(i.attributes).join(', ')})`:``),quantity:i.quantity,price:i.price,isReservation:false})),
        totalPrice,
        notes:[`النوع: ${addrType==='home'?'منزل':addrType==='work'?'عمل':'آخر'}`,`العنوان: ${addr.street}، ${addr.district}، ${addr.city}`,addr.details&&`تفاصيل: ${addr.details}`,coords&&`الموقع: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,`التوصيل: ${dl[delivery]}`,`الدفع: ${pl[payment]}`].filter(Boolean).join('\n'),
      })});
      if(res.ok){
        const oid=`#${Math.floor(Math.random()*90000+10000)}`;
        setOrderId(oid);
        const loc=coords?`\n📍 الموقع: https://maps.google.com/?q=${coords.lat},${coords.lng}`:'';
        const msg=`🛍️ *طلب جديد ${oid}*\n👤 ${customer.name}\n📱 ${customer.phone}\n🏠 ${addr.street}، ${addr.district}، ${addr.city}${loc}\n\n${cart.map(i=>`• ${i.productName} × ${i.quantity} — ${fmt(i.price*i.quantity)} ر.س`).join('\n')}\n\n📦 ${dl[delivery]}\n💳 ${pl[payment]}\n💰 *الإجمالي: ${fmt(totalPrice)} ر.س*`;
        window.open(`https://wa.me/${store.owner_phone||'966500000000'}?text=${encodeURIComponent(msg)}`,'_blank');
        setCart([]);setStep(3);setSubmitting(false);
      }else setSubmitting(false);
    }catch{setSubmitting(false);}
  };

  const resetAll=()=>{setStep(0);setSubmitting(false);setCustomer({name:'',phone:''});setAddr({street:'',district:'',city:'الرياض',details:''});setCoords(null);setMapActive(false);setShowCart(false);};

  const renderVars=(p:Product)=>{
    if(!p.variants?.length)return null;
    const m=p.variants.reduce((acc,v)=>{Object.entries(v.attributes).forEach(([k,val])=>{if(!acc[k])acc[k]=new Set<string>();acc[k].add(val)});return acc;},{} as Record<string,Set<string>>);
    return(
      <div className="sf-dvars">
        {Object.entries(m).map(([name,vals])=>(
          <div key={name}>
            <div className="sf-dvlbl">{name}:</div>
            <div className="sf-dvopts">
              {Array.from(vals).map(val=>{
                const v=p.variants?.find(vr=>vr.attributes[name]===val);
                const on=selVars[p.id]===v?.id;
                return<button key={val} className={`sf-dvbtn${on?' on':''}`} onClick={()=>v&&setSelVars(s=>({...s,[p.id]:v.id}))}>{val}</button>;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if(loading)return<div className="sf-loading"><div className="sf-spinner"/><p>جاري تحميل المتجر...</p></div>;
  if(!store)return<div className="sf-err"><span style={{fontSize:52}}>🏪</span><h2 style={{fontSize:22,fontWeight:800}}>المتجر غير موجود</h2><p style={{color:'var(--ct2)',fontSize:14}}>تأكد من صحة الرابط</p></div>;

  const dsc=(p:Product)=>p.original_price?Math.round((1-p.price/p.original_price)*100):0;

  return (
    <div className="sf">
      {/* TOP BAR */}
      <div className="sf-topbar">
        <div className="sf-tbi">
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div className="sf-ti"><Phone size={12}/>{store.phone||'920000000'}</div>
            <div className="sf-tdiv"/>
            <div className="sf-ti"><Clock size={12}/>مفتوح 8ص–12م</div>
            <div className="sf-tdiv"/>
            <div className="sf-ti"><Truck size={12}/>توصيل لجميع المناطق</div>
          </div>
          <div className="sf-ti"><Tag size={12}/>عروض حصرية | كود: SAVE10</div>
        </div>
      </div>

      {/* HEADER */}
      <header className="sf-header">
        <div className="sf-hi">
          <div className="sf-logo">
            {store.logo_url?<img src={store.logo_url} alt="logo" className="sf-logo-img"/>:<div className="sf-logo-ph">🏪</div>}
            <span className="sf-sname">{store.name}</span>
          </div>
          <div className="sf-sb">
            <input className="sf-si" placeholder="ابحث في المتجر..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <button className="sf-sbtn"><Search size={20}/></button>
          </div>
          <div className="sf-ha">
            <button className="sf-ib" title="الموقع"><MapPin size={20}/></button>
            <button className="sf-ib" title="المفضلة">
              <Heart size={20}/>
              {wishlist.size>0&&<span className="sf-bdg">{wishlist.size}</span>}
            </button>
            <button className="sf-cbtn" onClick={()=>{setShowCart(true);setStep(0);}}>
              <ShoppingCart size={20}/>
              <span>السلة</span>
              {totalItems>0&&<span style={{background:'rgba(0,0,0,.2)',width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900}}>{totalItems}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* NAV */}
      <div className="sf-navbar">
        <div className="sf-nbi">
          {categories.map(cat=>(
            <button key={cat} className={`sf-ni${category===cat?' on':''}`} onClick={()=>setCategory(cat)}>{cat}</button>
          ))}
        </div>
      </div>

      {/* DEAL BANNER */}
      <div className="sf-deal">
        <div className="sf-di">
          <div className="sf-dlbl">⚡ فلاش سيل</div>
          <div className="sf-dtxt">خصومات تصل حتى 50% على منتجات مختارة</div>
          <div className="sf-dtmr">
            <div className="sf-tb">{String(timer.h).padStart(2,'0')}</div>
            <span className="sf-ts">:</span>
            <div className="sf-tb">{String(timer.m).padStart(2,'0')}</div>
            <span className="sf-ts">:</span>
            <div className="sf-tb">{String(timer.s).padStart(2,'0')}</div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="sf-hero">
        <div className="sf-heri">
          <div className="sf-hertxt">
            <div className="sf-herbadge"><Flame size={14}/>عروض حصرية</div>
            <h1 className="sf-hertitle">{store.name}</h1>
            <p className="sf-hersub">{store.description||'تسوّق أفضل المنتجات بأسعار لا تُقاوم — توصيل سريع لباب بيتك'}</p>
            <div className="sf-herchips">
              <div className="sf-hchip"><Truck size={13}/>شحن مجاني فوق 200 ر.س</div>
              <div className="sf-hchip"><Shield size={13}/>ضمان الجودة</div>
              <div className="sf-hchip"><RefreshCw size={13}/>إرجاع مجاني 14 يوم</div>
              <div className="sf-hchip"><CheckCircle size={13}/>دفع آمن 100%</div>
            </div>
          </div>
          <div className="sf-herstats">
            <div className="sf-hsc"><div className="sf-hsn">{products.length}+</div><div className="sf-hsl">منتج</div></div>
            <div className="sf-hsc"><div className="sf-hsn">5K+</div><div className="sf-hsl">عميل</div></div>
            <div className="sf-hsc"><div className="sf-hsn">4.9</div><div className="sf-hsl">تقييم</div></div>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="sf-layout">
        {/* SIDEBAR */}
        <aside className="sf-sidebar">
          <div className="sf-sbc">
            <div className="sf-sbh"><Tag size={14}/>الفئات</div>
            {categories.map(cat=>{
              const cnt=cat==='الكل'?products.length:products.filter(p=>p.category===cat).length;
              return<button key={cat} className={`sf-cati${category===cat?' on':''}`} onClick={()=>setCategory(cat)}><span className="sf-catn">{cat}</span><span className="sf-catc">{cnt}</span></button>;
            })}
          </div>
          <div className="sf-sbc">
            <div className="sf-sbh"><Package size={14}/>فلتر البحث</div>
            <div className="sf-fb">
              <div>
                <div className="sf-ft"><span>السعر الأقصى</span><span className="sf-fv">{fmt(maxPrice)} ر.س</span></div>
                <input type="range" className="sf-range" min={0} max={topPrice} step={10} value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))} style={{margin:'8px 0'}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--ct3)'}}><span>0</span><span>{fmt(topPrice)}</span></div>
              </div>
              <label className="sf-ck"><input type="checkbox" checked={onlyInStock} onChange={e=>setOnlyInStock(e.target.checked)}/><span>المتوفر فقط</span></label>
              <div>
                <div className="sf-ft" style={{marginBottom:8}}>التقييم الأدنى</div>
                {[4,3,2,0].map(r=>(
                  <label key={r} className="sf-ck" onClick={()=>setMinRating(minRating===r?0:r)}>
                    <input type="radio" checked={minRating===r} readOnly style={{accentColor:'var(--cp)',cursor:'pointer'}}/>
                    {r>0?<><Stars r={r}/><span style={{fontSize:12,color:'var(--ct3)'}}>وأعلى</span></>:<span style={{fontSize:13}}>الكل</span>}
                  </label>
                ))}
              </div>
              {(onlyInStock||minRating>0||maxPrice<topPrice)&&<button onClick={()=>{setOnlyInStock(false);setMinRating(0);setMaxPrice(topPrice);}} style={{padding:'7px',border:'1.5px solid var(--cbr)',borderRadius:'var(--r)',background:'#fff',cursor:'pointer',fontSize:12,color:'var(--ct2)'}}>↺ إعادة ضبط الفلاتر</button>}
            </div>
          </div>
        </aside>

        {/* PRODUCTS */}
        <div>
          <div className="sf-toolbar">
            <div className="sf-tbl">
              <select className="sf-sel" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="default">الترتيب الافتراضي</option>
                <option value="newest">الأحدث أولاً</option>
                <option value="price-asc">السعر: من الأقل</option>
                <option value="price-desc">السعر: من الأعلى</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="name">الاسم أ–ي</option>
              </select>
              <div className="sf-vg">
                <button className={`sf-vb${viewMode==='grid'?' on':''}`} onClick={()=>setViewMode('grid')}><LayoutGrid size={16}/></button>
                <button className={`sf-vb${viewMode==='list'?' on':''}`} onClick={()=>setViewMode('list')}><List size={16}/></button>
              </div>
            </div>
            <span className="sf-rcount">{filtered.length} منتج</span>
          </div>

          {filtered.length===0?(
            <div className="sf-empty-st"><div className="sf-empi">🔍</div><div className="sf-empt">لا توجد منتجات</div><div className="sf-emps">جرب تغيير الفلاتر أو كلمة البحث</div></div>
          ):viewMode==='grid'?(
            <div className="sf-grid">
              {filtered.map(p=>{
                const{price,available}=getVI(p);const isOut=available<=0;const d=dsc(p);
                return(
                  <div key={p.id} className="sf-card" onClick={()=>{setDetailP(p);setDetailQty(1);}}>
                    <div className="sf-ciw">
                      {!imgErrs.has(p.id)&&p.image_url?<img src={p.image_url} alt={p.name} onError={()=>setImgErrs(e=>new Set(e).add(p.id))}/>:<div className="sf-ciph">📦</div>}
                      <div className="sf-cbadges">
                        {d>0&&<span className="sf-pill sf-pill-sale">-{d}%</span>}
                        {!isOut&&(p.rating||0)>=4.5&&<span className="sf-pill sf-pill-hot">🔥 رائج</span>}
                      </div>
                      <button className={`sf-wish${wishlist.has(p.id)?'':''}`} onClick={e=>{e.stopPropagation();setWishlist(w=>{const n=new Set(w);n.has(p.id)?n.delete(p.id):n.add(p.id);return n;})}}>
                        <Heart size={15} fill={wishlist.has(p.id)?'#E63946':'none'} stroke={wishlist.has(p.id)?'#E63946':'currentColor'}/>
                      </button>
                      {isOut&&<div className="sf-out-ov"><div className="sf-out-p">نفد المخزون</div></div>}
                    </div>
                    <div className="sf-cbody">
                      {p.category&&<span className="sf-ccat">{p.category}</span>}
                      <div className="sf-cname">{p.name}</div>
                      {(p.rating||0)>0&&<div className="sf-crat"><Stars r={p.rating}/><span className="sf-crat-n">{p.rating?.toFixed(1)}</span>{p.review_count&&<span className="sf-crat-c">({p.review_count})</span>}</div>}
                    </div>
                    <div className="sf-cfoot">
                      <div>
                        <span className="sf-pr">{fmt(price)}</span><span className="sf-pr-u"> ر.س</span>
                        {p.original_price&&<><span className="sf-pr-o">{fmt(p.original_price)} ر.س</span><span className="sf-pr-s">وفّر {fmt(p.original_price-price)} ر.س</span></>}
                      </div>
                      <button className="sf-atc" disabled={isOut} onClick={e=>{e.stopPropagation();addToCart(p);}}>
                        {isOut?'نفد':<><Plus size={14}/>سلة</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ):(
            <div className="sf-lv">
              {filtered.map(p=>{
                const{price,available}=getVI(p);const isOut=available<=0;const d=dsc(p);
                return(
                  <div key={p.id} className="sf-lc" onClick={()=>{setDetailP(p);setDetailQty(1);}}>
                    <div className="sf-li">
                      {!imgErrs.has(p.id)&&p.image_url?<img src={p.image_url} alt={p.name} onError={()=>setImgErrs(e=>new Set(e).add(p.id))}/>:<div className="sf-liph">📦</div>}
                    </div>
                    <div className="sf-lb">
                      <div className="sf-linfo">
                        {p.category&&<span className="sf-ccat">{p.category}</span>}
                        <div className="sf-cname" style={{fontSize:15}}>{p.name}</div>
                        {p.description&&<div className="sf-ldesc">{p.description}</div>}
                        {(p.rating||0)>0&&<div className="sf-crat"><Stars r={p.rating}/><span className="sf-crat-n">{p.rating?.toFixed(1)}</span></div>}
                        <div className="sf-ldel"><Truck size={13}/>توصيل خلال 1–3 أيام</div>
                      </div>
                      <div className="sf-lact">
                        <div>
                          <span className="sf-pr" style={{fontSize:22}}>{fmt(price)}</span><span className="sf-pr-u"> ر.س</span>
                          {p.original_price&&<><span className="sf-pr-o">{fmt(p.original_price)} ر.س</span><span className="sf-pr-s">وفّر {fmt(p.original_price-price)} ر.س</span></>}
                          {d>0&&<span className="sf-pill sf-pill-sale" style={{display:'inline-block',marginTop:6}}>-{d}%</span>}
                        </div>
                        <button className="sf-atc" style={{padding:'10px 18px',fontSize:13}} disabled={isOut} onClick={e=>{e.stopPropagation();addToCart(p);}}>
                          {isOut?'نفد المخزون':<><Plus size={14}/>أضف للسلة</>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT DETAIL SHEET */}
      {detailP&&(()=>{
        const p=detailP;const{price,available}=getVI(p);const isOut=available<=0;const d=dsc(p);
        return(
          <div className="sf-det-bd" onClick={()=>setDetailP(null)}>
            <div className="sf-det-sh" onClick={e=>e.stopPropagation()}>
              <div className="sf-det-hd"><span className="sf-det-ht">{p.name}</span><button className="sf-det-cl" onClick={()=>setDetailP(null)}><X size={18}/></button></div>
              <div className="sf-det-body">
                <div className="sf-det-img">
                  {!imgErrs.has(p.id)&&p.image_url?<img src={p.image_url} alt={p.name} onError={()=>setImgErrs(e=>new Set(e).add(p.id))}/>:<div className="sf-det-imgph">📦</div>}
                  {d>0&&<div style={{position:'absolute',top:14,right:14}}><span className="sf-pill sf-pill-sale">-{d}%</span></div>}
                </div>
                <div className="sf-det-info">
                  {p.category&&<span className="sf-ccat">{p.category}</span>}
                  <div className="sf-det-name">{p.name}</div>
                  {(p.rating||0)>0&&<div className="sf-crat"><Stars r={p.rating} sz={16}/><span style={{fontSize:14,fontWeight:700}}>{p.rating?.toFixed(1)}</span>{p.review_count&&<span style={{fontSize:13,color:'var(--ct3)'}}>({p.review_count} تقييم)</span>}</div>}
                  <div className="sf-det-pr">
                    <span className="sf-det-pr-curr">{fmt(price)} <span style={{fontSize:16,fontWeight:600}}>ر.س</span></span>
                    {p.original_price&&<span className="sf-det-pr-orig">{fmt(p.original_price)} ر.س</span>}
                    {d>0&&<span className="sf-det-save">وفّر {d}%</span>}
                  </div>
                  <div className="sf-det-stock">
                    {isOut?<><AlertCircle size={15} style={{color:'var(--ca)'}}/><span className="sf-no-stk">نفد من المخزون</span></>:<><CheckCircle size={15} style={{color:'var(--cg)'}}/><span className="sf-in-stk">متوفر ({available} قطعة)</span></>}
                  </div>
                  {renderVars(p)}
                  <div className="sf-qrow">
                    <div className="sf-qctrl">
                      <button className="sf-qbtn" onClick={()=>setDetailQty(q=>Math.max(1,q-1))}><Minus size={15}/></button>
                      <span className="sf-qnum">{detailQty}</span>
                      <button className="sf-qbtn" onClick={()=>setDetailQty(q=>Math.min(available,q+1))}><Plus size={15}/></button>
                    </div>
                    <button className="sf-det-addbtn" disabled={isOut} onClick={()=>{addToCart(p,detailQty);setDetailP(null);}}>
                      {isOut?'نفد المخزون':'أضف للسلة'}
                    </button>
                  </div>
                  {p.description&&<div className="sf-det-desc">{p.description}</div>}
                  <div className="sf-perks">
                    <div className="sf-perk"><Truck size={13}/>توصيل 1–3 أيام</div>
                    <div className="sf-perk"><Shield size={13}/>ضمان الجودة</div>
                    <div className="sf-perk"><RefreshCw size={13}/>إرجاع مجاني 14 يوم</div>
                    <div className="sf-perk"><CheckCircle size={13}/>دفع آمن 100%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CART DRAWER */}
      {showCart&&(
        <div className="sf-cart-bd" onClick={()=>setShowCart(false)}>
          <div className="sf-cart-dr" onClick={e=>e.stopPropagation()}>
            <div className="sf-cart-hd">
              <div className="sf-cart-hdtit">
                <ShoppingCart size={20}/>
                {step===0&&'سلة المشتريات'}{step===1&&'عنوان التوصيل'}{step===2&&'الدفع والتأكيد'}{step===3&&'تم الطلب ✓'}
                {totalItems>0&&step===0&&<span className="sf-cart-hdc">{totalItems}</span>}
              </div>
              <button className="sf-cart-x" onClick={()=>setShowCart(false)}><X size={20}/></button>
            </div>

            {step<3&&(
              <div className="sf-steps">
                {[{n:1,l:'السلة'},{n:2,l:'العنوان'},{n:3,l:'الدفع'}].map((s,i)=>(
                  <div key={s.n} className={`sf-step${step===i?' active':step>i?' done':''}`}>
                    <div className="sf-snum">{step>i?<CheckCircle size={14}/>:s.n}</div>
                    <div className="sf-slbl">{s.l}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="sf-cart-body">
              {/* STEP 0 */}
              {step===0&&(cart.length===0?(
                <div className="sf-empty-cart"><div className="sf-eci">🛒</div><div className="sf-ect">السلة فارغة</div><div className="sf-ecs">أضف منتجات للمتابعة</div></div>
              ):(
                <>
                  {cart.map(item=>(
                    <div key={`${item.productId}-${item.variantId}`} className="sf-ci">
                      <div className="sf-cithumb">{item.imageUrl?<img src={item.imageUrl} alt=""/>:'📦'}</div>
                      <div className="sf-ciinfo">
                        <div className="sf-ciname">{item.productName}</div>
                        {item.attributes&&<div className="sf-ciattrs">{Object.values(item.attributes).join(' · ')}</div>}
                        <div className="sf-ciprice">{fmt(item.price*item.quantity)} ر.س</div>
                        <div className="sf-cibottom">
                          <div className="sf-ciqty">
                            <button className="sf-ciqb" onClick={()=>updQty(item.productId,item.variantId,-1)}><Minus size={12}/></button>
                            <span className="sf-ciqn">{item.quantity}</span>
                            <button className="sf-ciqb" onClick={()=>updQty(item.productId,item.variantId,1)}><Plus size={12}/></button>
                          </div>
                          <button className="sf-cidel" onClick={()=>removeCI(item.productId,item.variantId)}>✕ حذف</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="sf-osum" style={{marginTop:14}}>
                    <div className="sf-sr"><span className="sf-sl">المجموع</span><span className="sf-sv">{fmt(subtotal)} ر.س</span></div>
                    {totalSaved>0&&<div className="sf-sr save"><span className="sf-sl">💰 وفّرت</span><span className="sf-sv">-{fmt(totalSaved)} ر.س</span></div>}
                  </div>
                </>
              ))}

              {/* STEP 1 */}
              {step===1&&(
                <div>
                  <div className="sf-asec">
                    <div className="sf-asec-t"><Phone size={15}/>بيانات التواصل</div>
                    <input className="sf-input" placeholder="الاسم الكامل *" value={customer.name} onChange={e=>setCustomer(c=>({...c,name:e.target.value}))}/>
                    <input className="sf-input" placeholder="رقم الجوال *" value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))}/>
                  </div>
                  <div className="sf-asec">
                    <div className="sf-asec-t"><MapPin size={15}/>نوع العنوان</div>
                    <div className="sf-atrow">
                      {[{k:'home' as const,l:'منزل',i:<Home size={18}/>},{k:'work' as const,l:'عمل',i:<Building2 size={18}/>},{k:'other' as const,l:'آخر',i:<MapPin size={18}/>}].map(a=>(
                        <div key={a.k} className={`sf-at${addrType===a.k?' on':''}`} onClick={()=>setAddrType(a.k)}>{a.i}<div className="sf-atlbl">{a.l}</div></div>
                      ))}
                    </div>
                    <input className="sf-input" placeholder="الشارع *" value={addr.street} onChange={e=>setAddr(a=>({...a,street:e.target.value}))}/>
                    <input className="sf-input" placeholder="الحي" value={addr.district} onChange={e=>setAddr(a=>({...a,district:e.target.value}))}/>
                    <input className="sf-input" placeholder="المدينة" value={addr.city} onChange={e=>setAddr(a=>({...a,city:e.target.value}))}/>
                    <textarea className="sf-input" placeholder="تفاصيل إضافية..." value={addr.details} onChange={e=>setAddr(a=>({...a,details:e.target.value}))} rows={2}/>
                    {!mapActive?(
                      <div className="sf-map-ph" onClick={getLocation}>
                        <MapPin size={28}/><p>تحديد موقعي على الخريطة</p><span>اضغط للحصول على موقعك الحالي تلقائياً</span>
                      </div>
                    ):(
                      <>
                        <div className="sf-map-act">
                          <iframe className="sf-map-frm" src={`https://maps.google.com/maps?q=${coords?.lat},${coords?.lng}&z=16&output=embed`} allowFullScreen loading="lazy"/>
                        </div>
                        {coords&&<div className="sf-map-coords"><Navigation size={13}/>تم تحديد موقعك: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div>}
                        <button onClick={()=>{setMapActive(false);setCoords(null);}} style={{fontSize:12,color:'var(--ct3)',background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:10}}>✕ إزالة الموقع</button>
                      </>
                    )}
                  </div>
                  <div className="sf-asec">
                    <div className="sf-asec-t"><Truck size={15}/>طريقة التوصيل</div>
                    <div className="sf-dopts">
                      {[{k:'standard' as const,ic:'🚚',t:'توصيل عادي',s:'خلال 2–4 أيام عمل',p:10},{k:'express' as const,ic:'⚡',t:'توصيل سريع',s:'خلال 24 ساعة',p:25},{k:'pickup' as const,ic:'🏪',t:'استلام من المتجر',s:'مجاناً — خلال يوم عمل',p:0}].map(d=>(
                        <div key={d.k} className={`sf-dopt${delivery===d.k?' on':''}`} onClick={()=>setDelivery(d.k)}>
                          <div className="sf-dopt-ic">{d.ic}</div>
                          <div className="sf-dopt-info"><div className="sf-dopt-t">{d.t}</div><div className="sf-dopt-s">{d.s}</div></div>
                          <div className="sf-dopt-p">{d.p===0?'مجاناً':`${d.p} ر.س`}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step===2&&(
                <div>
                  <div className="sf-asec">
                    <div className="sf-asec-t"><CreditCard size={15}/>طريقة الدفع</div>
                    <div className="sf-payms">
                      {[{k:'cash' as const,ic:'💵',t:'كاش عند الاستلام',s:'ادفع عند وصول الطلب',b:null},{k:'card' as const,ic:'💳',t:'بطاقة بنكية',s:'Visa / Mastercard / Mada',b:'آمن 100%'},{k:'transfer' as const,ic:'🏦',t:'تحويل بنكي',s:'تحويل مسبق قبل الشحن',b:null},{k:'wallet' as const,ic:'📱',t:'محفظة إلكترونية',s:'STC Pay / Apple Pay',b:null}].map(m=>(
                        <div key={m.k} className={`sf-paym${payment===m.k?' on':''}`} onClick={()=>setPayment(m.k)}>
                          <div className="sf-payic">{m.ic}</div>
                          <div className="sf-payinfo"><div className="sf-payt">{m.t}</div><div className="sf-pays">{m.s}</div></div>
                          {m.b&&<span className="sf-payb">{m.b}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="sf-osum">
                    <div className="sf-sr"><span className="sf-sl">المنتجات ({totalItems})</span><span className="sf-sv">{fmt(subtotal)} ر.س</span></div>
                    <div className="sf-sr"><span className="sf-sl">التوصيل</span><span className="sf-sv">{delCost===0?'مجاناً':`${delCost} ر.س`}</span></div>
                    {totalSaved>0&&<div className="sf-sr save"><span className="sf-sl">💰 وفّرت</span><span className="sf-sv">-{fmt(totalSaved)} ر.س</span></div>}
                    <div className="sf-sr total"><span className="sf-sl">الإجمالي</span><span className="sf-sv">{fmt(totalPrice)} ر.س</span></div>
                  </div>
                  <div style={{background:'var(--cpl)',border:'1px solid rgba(240,165,0,.25)',borderRadius:'var(--r2)',padding:'12px 14px',fontSize:13}}>
                    <div style={{fontWeight:700,marginBottom:4}}>ملخص الطلب</div>
                    <div style={{color:'var(--ct2)',lineHeight:1.7}}>
                      <div>👤 {customer.name} — {customer.phone}</div>
                      <div>📍 {addr.street}{addr.district&&`، ${addr.district}`}، {addr.city}</div>
                      {coords&&<div style={{color:'var(--cg)'}}>🗺 موقع محدد على الخريطة ✓</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step===3&&(
                <div className="sf-succ">
                  <div className="sf-succ-ring"><CheckCircle size={44} color="#2D9653"/></div>
                  <div className="sf-succ-t">تم إرسال طلبك! 🎉</div>
                  <div className="sf-succ-s">تم إرسال طلبك عبر واتساب. سيتواصل معك صاحب المتجر قريباً لتأكيد الطلب</div>
                  {orderId&&<div className="sf-succ-oid">رقم الطلب: {orderId}</div>}
                  <button className="sf-cont" onClick={resetAll}>متابعة التسوق</button>
                </div>
              )}
            </div>

            {step<3&&(
              <div className="sf-cart-foot">
                {step===0&&cart.length>0&&<button className="sf-cnext" onClick={()=>setStep(1)}>متابعة لتحديد العنوان<ChevronLeft size={18}/></button>}
                {step===1&&<>
                  <button className="sf-cnext" disabled={!customer.name.trim()||!customer.phone.trim()||!addr.street.trim()} onClick={()=>setStep(2)}>متابعة للدفع<ChevronLeft size={18}/></button>
                  <button className="sf-cback" onClick={()=>setStep(0)}><ArrowLeft size={15}/>رجوع للسلة</button>
                </>}
                {step===2&&<>
                  <button className="sf-cwa" disabled={submitting} onClick={submitOrder}><span>📱</span>{submitting?'جاري الإرسال...':`تأكيد الطلب — ${fmt(totalPrice)} ر.س`}</button>
                  <button className="sf-cback" onClick={()=>setStep(1)}><ArrowLeft size={15}/>رجوع للعنوان</button>
                </>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
