import { useState, useMemo, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM — Clean monochrome + blue accents, dark/light
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg0:"#0a0b0d", bg1:"#0f1115", bg2:"#161b22", bg3:"#1c2128", bg4:"#222830",
    border:"#21262d", borderHi:"#30363d", borderFocus:"#388bfd66",
    acc:"#388bfd", accLo:"#388bfd14", accMid:"#388bfd30",
    green:"#3fb950", greenLo:"#3fb95014",
    red:"#f85149",   redLo:"#f8514914",
    blue:"#388bfd",  blueLo:"#388bfd14",
    sky:"#79c0ff",   skyLo:"#79c0ff12",
    violet:"#d2a8ff",violetLo:"#d2a8ff12",
    orange:"#ffa657",orangeLo:"#ffa65712",
    teal:"#39d353",  tealLo:"#39d35312",
    amber:"#e3b341", amberLo:"#e3b34114", amberMid:"#e3b34130",
    txt:"#c9d1d9", txtMid:"#6e7681", txtDim:"#30363d",
    mono:"'JetBrains Mono','Fira Code',monospace",
    sans:"'DM Sans','Segoe UI',system-ui,sans-serif",
    scheme:"dark",
  },
  light: {
    bg0:"#f6f8fa", bg1:"#ffffff", bg2:"#f6f8fa", bg3:"#eaeef2", bg4:"#d0d7de",
    border:"#d0d7de", borderHi:"#afb8c1", borderFocus:"#0969da66",
    acc:"#0969da", accLo:"#0969da10", accMid:"#0969da25",
    green:"#1a7f37", greenLo:"#1a7f3712",
    red:"#cf222e",   redLo:"#cf222e12",
    blue:"#0969da",  blueLo:"#0969da12",
    sky:"#0550ae",   skyLo:"#0550ae12",
    violet:"#6e40c9",violetLo:"#6e40c912",
    orange:"#bc4c00",orangeLo:"#bc4c0012",
    teal:"#1a7f37",  tealLo:"#1a7f3712",
    amber:"#9a6700", amberLo:"#9a670010", amberMid:"#9a670025",
    txt:"#1f2328", txtMid:"#57606a", txtDim:"#d0d7de",
    mono:"'JetBrains Mono','Fira Code',monospace",
    sans:"'DM Sans','Segoe UI',system-ui,sans-serif",
    scheme:"light",
  },
};

// Mutable D — swapped on theme toggle, triggers full re-render via key
let D = THEMES.dark;

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
// Users — mutable array, registration adds to this at runtime
let USERS = [
  { id:"U001", name:"Victor Casmac",  role:"admin",      email:"vcasmac@gmail.com",   password:"Trabajo2", avatar:"VC" },
  { id:"U002", name:"Carlos Rivera",  role:"technician", email:"c.rivera@plant.com",  password:"tech123",  avatar:"CR" },
  { id:"U003", name:"Maria Santos",   role:"supervisor", email:"m.santos@plant.com",  password:"sup123",   avatar:"MS" },
  { id:"U004", name:"Tech. Reyes",    role:"technician", email:"t.reyes@plant.com",   password:"tech456",  avatar:"TR" },
];

const ASSET_TYPES_DATA = [
  { type_id:"MOT", type_name:"Electric Motor",            icon:"⚙", color:D.amber },
  { type_id:"TXH", type_name:"Transformer High Voltage",  icon:"⚡", color:D.red },
  { type_id:"TXL", type_name:"Transformer Low Voltage",   icon:"⚡", color:D.orange },
  { type_id:"EPL", type_name:"Electrical Panel",          icon:"▦", color:D.blue },
  { type_id:"MCC", type_name:"Motor Control Center",      icon:"◫", color:D.violet },
  { type_id:"MCB", type_name:"MCC Bucket",                icon:"◰", color:D.violet },
  { type_id:"CBR", type_name:"Circuit Breaker",           icon:"⊟", color:D.sky },
  { type_id:"LDC", type_name:"Local Disconnect",          icon:"⊠", color:D.teal },
  { type_id:"PDC", type_name:"Power Distribution Center", icon:"◈", color:D.green },
  { type_id:"SPL", type_name:"Splitter",                  icon:"⋈", color:D.txtMid },
  { type_id:"JBX", type_name:"Junction Box",              icon:"▣", color:D.txtMid },
];

const ASSET_SUBTYPES_DATA = [
  { subtype_id:"MOT-S",  parent_type_id:"MOT", subtype_name:"Motor under 50 HP",        condition:"hp < 50" },
  { subtype_id:"MOT-M",  parent_type_id:"MOT", subtype_name:"Motor 50–200 HP",           condition:"hp >= 50 && hp <= 200" },
  { subtype_id:"MOT-L",  parent_type_id:"MOT", subtype_name:"Motor above 200 HP",        condition:"hp > 200" },
];

const TYPE_ATTRS = {
  MOT: [
    { attr_id:"a1", name:"voltage",     label:"Voltage (V)",    type:"number", required:true  },
    { attr_id:"a2", name:"horsepower",  label:"Horsepower (HP)",type:"number", required:true  },
    { attr_id:"a3", name:"rpm",         label:"RPM",            type:"number", required:false },
    { attr_id:"a4", name:"frame",       label:"Frame",          type:"text",   required:false },
    { attr_id:"a5", name:"enclosure",   label:"Enclosure",      type:"select", options:["TEFC","ODP","TENV","Explosion-Proof"], required:false },
  ],
  TXH: [
    { attr_id:"b1", name:"primary_voltage",   label:"Primary Voltage (kV)", type:"number", required:true  },
    { attr_id:"b2", name:"secondary_voltage", label:"Secondary Voltage (V)", type:"number", required:true  },
    { attr_id:"b3", name:"kva_rating",        label:"kVA Rating",            type:"number", required:true  },
    { attr_id:"b4", name:"cooling_type",      label:"Cooling Type",          type:"select", options:["ONAN","ONAF","ONAN/ONAF"], required:false },
  ],
  EPL: [
    { attr_id:"c1", name:"voltage",     label:"Voltage (V)",    type:"number", required:true  },
    { attr_id:"c2", name:"amperage",    label:"Main Amperage",  type:"number", required:true  },
    { attr_id:"c3", name:"phases",      label:"Phases",         type:"select", options:["1","3"], required:true },
  ],
};

const ASSETS_DATA = [
  { asset_id:"AST-000001", asset_name:"Substation Main", asset_type:"TXH", parent_asset:"", location:"Yard - North", part_number:"TX-ONAN-500", serial_number:"TX-2019-0012", vendor:"ABB", manufacturer:"ABB Power", status:"ACTIVE", attrs:{ primary_voltage:13.8, secondary_voltage:480, kva_rating:500, cooling_type:"ONAN" } },
  { asset_id:"AST-000002", asset_name:"MCC Building 3", asset_type:"MCC", parent_asset:"AST-000001", location:"Building 3 - Room 1A", part_number:"MCC-NEMA1", serial_number:"MCC-2020-091", vendor:"Eaton", manufacturer:"Eaton Cutler-Hammer", status:"ACTIVE", attrs:{} },
  { asset_id:"AST-000003", asset_name:"Panel EP-12", asset_type:"EPL", parent_asset:"AST-000002", location:"Building 3 - Bay 1", part_number:"EP-200A-3PH", serial_number:"EP-2020-0344", vendor:"Square D", manufacturer:"Schneider Electric", status:"ACTIVE", attrs:{ voltage:480, amperage:200, phases:"3" } },
  { asset_id:"AST-000004", asset_name:"Pump Motor P-101", asset_type:"MOT", parent_asset:"AST-000003", location:"Building 3 - Bay 2", part_number:"4P200L-460", serial_number:"SN-2021-4891", vendor:"ABB", manufacturer:"ABB Motors", status:"ACTIVE", attrs:{ voltage:460, horsepower:250, rpm:1800, frame:"449T", enclosure:"TEFC" } },
  { asset_id:"AST-000005", asset_name:"Compressor Motor C-204", asset_type:"MOT", parent_asset:"AST-000002", location:"Compressor Bay", part_number:"2P75L-480", serial_number:"SN-2022-7712", vendor:"GE", manufacturer:"GE Motors", status:"ACTIVE", attrs:{ voltage:480, horsepower:75, rpm:3600, frame:"365T", enclosure:"ODP" } },
  { asset_id:"AST-000006", asset_name:"Fan Motor F-008", asset_type:"MOT", parent_asset:"AST-000002", location:"Cooling Tower", part_number:"2P15L-460", serial_number:"SN-2023-1102", vendor:"WEG", manufacturer:"WEG Industries", status:"MAINTENANCE", attrs:{ voltage:460, horsepower:15, rpm:1750, frame:"254T", enclosure:"TEFC" } },
  { asset_id:"AST-000007", asset_name:"Local Disconnect LD-01", asset_type:"LDC", parent_asset:"AST-000004", location:"Building 3 - Bay 2", part_number:"LD-30A-600V", serial_number:"LD-2022-0088", vendor:"Eaton", manufacturer:"Eaton", status:"ACTIVE", attrs:{} },
];

const MAINT_TASKS_DATA = [
  { task_id:"MT001", asset_type:"MOT", subtype:"MOT-S,MOT-M,MOT-L", description:"Inspect motor temperature with IR thermometer", frequency:"Monthly",   safety:"DE-ENERGIZED",    estimated_duration:30 },
  { task_id:"MT002", asset_type:"MOT", subtype:"MOT-S,MOT-M,MOT-L", description:"Clean ventilation openings and cooling fins",   frequency:"Monthly",   safety:"DE-ENERGIZED",    estimated_duration:20 },
  { task_id:"MT003", asset_type:"MOT", subtype:"MOT-S,MOT-M,MOT-L", description:"Inspect electrical terminal connections",        frequency:"Quarterly", safety:"LOCKOUT TAGOUT",  estimated_duration:45 },
  { task_id:"MT004", asset_type:"MOT", subtype:"MOT-S,MOT-M,MOT-L", description:"Check vibration levels (accelerometer)",         frequency:"Monthly",   safety:"RUNNING",         estimated_duration:20 },
  { task_id:"MT005", asset_type:"MOT", subtype:"MOT-M,MOT-L",       description:"Inspect bearing lubrication",                    frequency:"Quarterly", safety:"DE-ENERGIZED",    estimated_duration:60 },
  { task_id:"MT006", asset_type:"MOT", subtype:"MOT-L",             description:"Full electrical insulation test (Megger)",       frequency:"Annual",    safety:"LOCKOUT TAGOUT",  estimated_duration:120 },
  { task_id:"MT007", asset_type:"TXH", subtype:"",                  description:"Inspect oil level and dielectric test",          frequency:"Semi-Annual",safety:"LOCKOUT TAGOUT",  estimated_duration:180 },
  { task_id:"MT008", asset_type:"TXH", subtype:"",                  description:"Inspect cooling radiators and fans",              frequency:"Quarterly", safety:"RUNNING",         estimated_duration:60 },
  { task_id:"MT009", asset_type:"EPL", subtype:"",                  description:"Thermal imaging scan of all breakers",            frequency:"Monthly",   safety:"RUNNING",         estimated_duration:45 },
  { task_id:"MT010", asset_type:"EPL", subtype:"",                  description:"Inspect and tighten bus connections",             frequency:"Annual",    safety:"LOCKOUT TAGOUT",  estimated_duration:240 },
];

const WORK_ORDERS_DATA = [
  { wo_id:"WO-000001", wo_type:"PM", asset_id:"AST-000001", assigned_to:"U001", created_by:"System", priority:"HIGH",     status:"IN_PROGRESS", due_date:"2025-03-15", estimated_duration:120, actual_duration:null, safety_condition:"DE-ENERGIZED", completion_notes:"", description:"Monthly PM — Pump Motor P-101", problem_description:"", diagnosis:"", corrective_action:"", checklist:[{id:"MT001",done:true,notes:"68°C — normal"},{id:"MT002",done:false,notes:""},{id:"MT004",done:false,notes:""}] },
  { wo_id:"WO-000002", wo_type:"CM", asset_id:"AST-000002", assigned_to:"U002", created_by:"U002",   priority:"CRITICAL", status:"OPEN",        due_date:"2025-03-10", estimated_duration:240, actual_duration:null, safety_condition:"LOCKOUT TAGOUT", completion_notes:"", description:"TX-01 high temperature alarm tripped", problem_description:"Transformer tripped on high temp alarm at 95°C", diagnosis:"", corrective_action:"", checklist:[] },
  { wo_id:"WO-000003", wo_type:"PRJ", asset_id:"AST-000003", assigned_to:"U001", created_by:"U002",  priority:"MEDIUM",   status:"ASSIGNED",    due_date:"2025-04-30", estimated_duration:1440, actual_duration:null, safety_condition:"LOCKOUT TAGOUT", completion_notes:"", description:"MCC-B4 Bus Bar Replacement Project", problem_description:"", diagnosis:"", corrective_action:"", checklist:[{id:"P001",done:true,notes:""},{id:"P002",done:false,notes:""}] },
  { wo_id:"WO-000004", wo_type:"PM", asset_id:"AST-000005", assigned_to:"U004", created_by:"System", priority:"MEDIUM",   status:"COMPLETED",   due_date:"2025-02-28", estimated_duration:60,  actual_duration:55, safety_condition:"RUNNING", completion_notes:"All checks normal. No anomalies.", description:"Monthly PM — Panel EP-12 Thermal Scan", problem_description:"", diagnosis:"", corrective_action:"", checklist:[{id:"MT009",done:true,notes:"Max 42°C"}] },
];

const WORK_REQUESTS_DATA = [
  { wr_id:"WR-000001", asset_id:"AST-000006", asset_name:"Fan Motor F-008", description:"Motor making unusual grinding noise at startup. Possible bearing issue.", priority:"HIGH",   requested_by:"U001", request_date:"2025-03-08", status:"PENDING",   converted_to_wo:"" },
  { wr_id:"WR-000002", asset_id:"AST-000003", asset_name:"Panel MCC-B4",    description:"Bucket 12 tripping on overload intermittently. FLA readings normal.",  priority:"MEDIUM", requested_by:"U004", request_date:"2025-03-07", status:"REVIEWED",  converted_to_wo:"" },
  { wr_id:"WR-000003", asset_id:"AST-000002", asset_name:"Main Transformer", description:"Oil level low on sight glass. Possible gasket leak.",                  priority:"CRITICAL",requested_by:"U004", request_date:"2025-03-06", status:"CONVERTED", converted_to_wo:"WO-000002" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function mk$(D) { return {
  card: { background:D.bg2, border:`1px solid ${D.border}`, borderRadius:8, overflow:"hidden" },
  input: (focus) => ({ background:D.bg3, border:`1px solid ${focus?D.borderFocus:D.borderHi}`, borderRadius:5, color:D.txt, padding:"10px 12px", fontFamily:D.mono, fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" }),
  label: { display:"block", color:D.txtMid, fontSize:10, fontFamily:D.mono, letterSpacing:1.5, textTransform:"uppercase", marginBottom:5 },
  btn: (c,full) => ({ background:`${c}18`, border:`1px solid ${c}55`, color:c, borderRadius:5, padding:"10px 18px", cursor:"pointer", fontFamily:D.mono, fontSize:11, letterSpacing:1, fontWeight:700, textTransform:"uppercase", transition:"all 0.15s", width:full?"100%":"auto", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }),
  section: { padding:"14px 16px", borderBottom:`1px solid ${D.border}` },
  badge: (c) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:3, border:`1px solid ${c}55`, background:`${c}18`, color:c, fontSize:10, fontFamily:D.mono, letterSpacing:1, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap" }),
};}
let $ = mk$(D);

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
// These are computed at render time via getColors(D)
const TYPE_ICON = { PM:"◈", CM:"⚠", PRJ:"◎" };
function getColors(D) {
  return {
    TYPE_COL: { PM:D.green, CM:D.red, PRJ:D.blue },
    PRI_COL:  { CRITICAL:D.red, HIGH:D.orange, MEDIUM:D.blue, LOW:D.green },
    STA_COL:  { OPEN:D.sky, ASSIGNED:D.blue, IN_PROGRESS:D.amber, COMPLETED:D.green, CLOSED:D.txtMid, CANCELLED:D.red },
    WR_COL:   { PENDING:D.amber, REVIEWED:D.blue, CONVERTED:D.green, REJECTED:D.red },
    SAF_COL:  { RUNNING:D.green, "DE-ENERGIZED":D.amber, "LOCKOUT TAGOUT":D.red },
  };
}
// Module-level aliases updated on render
let TYPE_COL = getColors(D).TYPE_COL;
let PRI_COL  = getColors(D).PRI_COL;
let STA_COL  = getColors(D).STA_COL;
let WR_COL   = getColors(D).WR_COL;
let SAF_COL  = getColors(D).SAF_COL;

function Chip({ label, color }) {
  return <span style={$.badge(color || D.txtMid)}>{label}</span>;
}
function WOType({ t }) {
  const c = TYPE_COL[t]||D.txtMid;
  return <span style={$.badge(c)}>{TYPE_ICON[t]} {t}</span>;
}
function Priority({ p }) { return <Chip label={`◆ ${p}`} color={PRI_COL[p]} />; }
function Status({ s }) { return <Chip label={`● ${STA_COL[s]?s:s}`} color={STA_COL[s]||D.txtMid} />; }
function WRStatus({ s }) { return <Chip label={s} color={WR_COL[s]||D.txtMid} />; }
function Safety({ s }) {
  const c = SAF_COL[s] || D.txtMid;
  const icon = s==="LOCKOUT TAGOUT"?"🔒":s==="DE-ENERGIZED"?"⚡":"▶";
  return <span style={{ ...$.badge(c), fontSize:11 }}>{icon} {s}</span>;
}

function Field({ label, children, style={} }) {
  return (
    <div style={{ marginBottom:14, ...style }}>
      <label style={$.label}>{label}</label>
      {children}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 12px" }}>
      <div style={{ flex:1, height:1, background:D.border }} />
      {label && <span style={{ color:D.txtDim, fontSize:9, fontFamily:D.mono, letterSpacing:2, textTransform:"uppercase" }}>{label}</span>}
      <div style={{ flex:1, height:1, background:D.border }} />
    </div>
  );
}

function Avatar({ initials, color=D.amber, size=32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}22`, border:`2px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", color, fontSize:size*0.35, fontFamily:D.mono, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function Input({ label, type="text", value, onChange, placeholder, options, required }) {
  const [focus, setFocus] = useState(false);
  if (type === "select") return (
    <Field label={label + (required?" *":"")}>
      <select value={value} onChange={e=>onChange(e.target.value)} style={$.input(focus)} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
  if (type === "textarea") return (
    <Field label={label + (required?" *":"")}>
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3}
        style={{ ...$.input(focus), resize:"vertical", fontFamily:D.sans, lineHeight:1.6 }}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} />
    </Field>
  );
  return (
    <Field label={label + (required?" *":"")}>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={$.input(focus)} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} />
    </Field>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ padding:"40px 20px", textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:10, opacity:0.3 }}>{icon}</div>
      <div style={{ color:D.txtDim, fontFamily:D.mono, fontSize:12 }}>{message}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: LOGIN / REGISTER
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, themeName, onToggleTheme }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name:"", email:"", pass:"", pass2:"" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);
  const f = (k) => (v) => setForm(p=>({...p,[k]:v}));
  const inp = (key, type="text", placeholder="") => ({
    type, value:form[key], placeholder,
    onChange:e=>f(key)(e.target.value),
    onFocus:()=>setFocus(key), onBlur:()=>setFocus(null),
    onKeyDown:e=>e.key==="Enter"&&(mode==="login"?doLogin():doRegister()),
    style:{ background:D.bg3, border:`1px solid ${focus===key?D.borderFocus:D.borderHi}`,
      borderRadius:6, color:D.txt, padding:"11px 14px", fontFamily:D.sans,
      fontSize:14, width:"100%", outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" },
  });

  const doLogin = () => {
    setErr(""); setLoading(true);
    setTimeout(()=>{
      const u = USERS.find(u=>u.email===form.email && u.password===form.pass);
      if (u) onLogin(u);
      else { setErr("Incorrect email or password."); setLoading(false); }
    }, 500);
  };

  const doRegister = () => {
    setErr(""); setOk("");
    if (!form.name.trim()) return setErr("Full name is required.");
    if (!form.email.includes("@")) return setErr("Enter a valid email.");
    if (form.pass.length < 6) return setErr("Password must be at least 6 characters.");
    if (form.pass !== form.pass2) return setErr("Passwords do not match.");
    if (USERS.find(u=>u.email===form.email)) return setErr("An account with this email already exists.");
    const newUser = {
      id: "U" + String(USERS.length+1).padStart(3,"0"),
      name: form.name.trim(),
      role: "technician",
      email: form.email.trim().toLowerCase(),
      password: form.pass,
      avatar: form.name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2),
    };
    USERS.push(newUser);
    setOk("Account created! You can now sign in.");
    setMode("login");
    setForm(p=>({...p, name:"", pass:"", pass2:""}));
  };

  return (
    <div style={{ minHeight:"100vh", background:D.bg0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:D.sans,
      color:D.txt }}>
      {/* Subtle dot grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:`radial-gradient(${D.border} 1px, transparent 1px)`,
        backgroundSize:"28px 28px", opacity:0.6, pointerEvents:"none" }} />

      {/* Theme toggle top-right */}
      <button onClick={onToggleTheme} style={{ position:"fixed", top:16, right:16, background:D.bg2,
        border:`1px solid ${D.border}`, borderRadius:6, color:D.txtMid, padding:"6px 12px",
        cursor:"pointer", fontFamily:D.mono, fontSize:11, zIndex:10 }}>
        {themeName==="dark" ? "☀ Light" : "◑ Dark"}
      </button>

      <div style={{ width:"100%", maxWidth:400, position:"relative", zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:52, height:52, background:D.accLo, border:`2px solid ${D.acc}44`,
            borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 14px", fontSize:24 }}>⚡</div>
          <div style={{ color:D.txt, fontFamily:D.mono, fontSize:18, fontWeight:700, letterSpacing:2 }}>CMMS</div>
          <div style={{ color:D.txtMid, fontSize:11, fontFamily:D.mono, letterSpacing:2, marginTop:4 }}>
            INDUSTRIAL MAINTENANCE SYSTEM
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display:"flex", background:D.bg3, borderRadius:8, padding:3, marginBottom:24,
          border:`1px solid ${D.border}` }}>
          {[["login","Sign In"],["register","Create Account"]].map(([m,label])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");setOk("");}}
              style={{ flex:1, padding:"9px 0", borderRadius:6, border:"none", cursor:"pointer",
                fontFamily:D.sans, fontSize:13, fontWeight:600, transition:"all 0.15s",
                background:mode===m?D.bg1:"transparent",
                color:mode===m?D.txt:D.txtMid,
                boxShadow:mode===m?`0 1px 3px #0003`:"none" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:D.bg1, border:`1px solid ${D.border}`, borderRadius:10,
          padding:24, borderTop:`2px solid ${D.acc}` }}>

          {ok && <div style={{ background:D.greenLo, border:`1px solid ${D.green}44`, borderRadius:6,
            padding:"10px 14px", color:D.green, fontSize:13, fontFamily:D.sans, marginBottom:16 }}>
            ✓ {ok}
          </div>}
          {err && <div style={{ background:D.redLo, border:`1px solid ${D.red}44`, borderRadius:6,
            padding:"10px 14px", color:D.red, fontSize:13, fontFamily:D.sans, marginBottom:16 }}>
            ⚠ {err}
          </div>}

          {mode==="login" ? (
            <>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", color:D.txtMid, fontSize:11, fontFamily:D.mono,
                  letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Email</label>
                <input {...inp("email","email","you@company.com")} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", color:D.txtMid, fontSize:11, fontFamily:D.mono,
                  letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Password</label>
                <input {...inp("pass","password","••••••••")} />
              </div>
              <button onClick={doLogin} disabled={loading}
                style={{ width:"100%", background:D.acc, border:"none", borderRadius:7, color:"#fff",
                  padding:"12px 0", fontFamily:D.sans, fontSize:14, fontWeight:700, cursor:"pointer",
                  opacity:loading?0.7:1, transition:"opacity 0.15s" }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <div style={{ marginTop:16, textAlign:"center" }}>
                <span style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans }}>
                  No account?{" "}
                  <span onClick={()=>{setMode("register");setErr("");}} 
                    style={{ color:D.acc, cursor:"pointer", fontWeight:600 }}>Create one</span>
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", color:D.txtMid, fontSize:11, fontFamily:D.mono,
                  letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Full Name</label>
                <input {...inp("name","text","Jane Smith")} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", color:D.txtMid, fontSize:11, fontFamily:D.mono,
                  letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Email</label>
                <input {...inp("email","email","you@company.com")} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", color:D.txtMid, fontSize:11, fontFamily:D.mono,
                  letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Password</label>
                <input {...inp("pass","password","Min. 6 characters")} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", color:D.txtMid, fontSize:11, fontFamily:D.mono,
                  letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Confirm Password</label>
                <input {...inp("pass2","password","Repeat password")} />
              </div>
              <div style={{ background:D.bg3, border:`1px solid ${D.border}`, borderRadius:6,
                padding:"9px 12px", marginBottom:16, display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:14 }}>ℹ</span>
                <span style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans }}>
                  New accounts are assigned the <strong style={{ color:D.txt }}>Technician</strong> role.
                  Contact your admin to change roles.
                </span>
              </div>
              <button onClick={doRegister}
                style={{ width:"100%", background:D.acc, border:"none", borderRadius:7, color:"#fff",
                  padding:"12px 0", fontFamily:D.sans, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                Create Account
              </button>
              <div style={{ marginTop:16, textAlign:"center" }}>
                <span style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans }}>
                  Already have an account?{" "}
                  <span onClick={()=>{setMode("login");setErr("");}}
                    style={{ color:D.acc, cursor:"pointer", fontWeight:600 }}>Sign in</span>
                </span>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:16, color:D.txtMid, fontSize:11, fontFamily:D.mono }}>
          v1.0 · CMMS Industrial
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function getMenuItems(role) {
  const tech = [
    { id:"dashboard",     icon:"◈", label:"Dashboard" },
    { id:"asset-search",  icon:"⊕", label:"Search Assets" },
    { id:"my-workorders", icon:"⊞", label:"My Work Orders" },
    { id:"work-requests", icon:"✦", label:"Work Requests" },
  ];
  const sup = [
    ...tech,
    { id:"asset-mgmt",  icon:"▦", label:"Asset Management", divider:true },
    { id:"assign-wo",   icon:"⊟", label:"Assign Work Orders" },
    { id:"csv-import",  icon:"⇡", label:"CSV Import" },
  ];
  const adm = [
    ...sup,
    { id:"user-mgmt",    icon:"◯", label:"User Management", divider:true },
    { id:"asset-types",  icon:"⋈", label:"Asset Types" },
    { id:"maint-tasks",  icon:"✓", label:"Maintenance Tasks" },
  ];
  return role==="admin"?adm:role==="supervisor"?sup:tech;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ user }) {
  const myWOs = WORK_ORDERS_DATA.filter(w=>w.assigned_to===user.id);
  const openWOs = WORK_ORDERS_DATA.filter(w=>w.status==="OPEN"||w.status==="IN_PROGRESS");
  const pendingWRs = WORK_REQUESTS_DATA.filter(w=>w.status==="PENDING");

  const stats = user.role==="technician"
    ? [
        { label:"My Open WOs",   value:myWOs.filter(w=>w.status!=="COMPLETED"&&w.status!=="CLOSED").length, color:D.amber, icon:"⊞" },
        { label:"In Progress",   value:myWOs.filter(w=>w.status==="IN_PROGRESS").length,                     color:D.green, icon:"▶" },
        { label:"Completed",     value:myWOs.filter(w=>w.status==="COMPLETED").length,                       color:D.sky,   icon:"✓" },
        { label:"My Requests",   value:WORK_REQUESTS_DATA.filter(w=>w.requested_by===user.id).length,        color:D.violet,icon:"✦" },
      ]
    : [
        { label:"Open WOs",      value:openWOs.length,                                                        color:D.amber,  icon:"⊞" },
        { label:"Critical",      value:WORK_ORDERS_DATA.filter(w=>w.priority==="CRITICAL"&&w.status!=="COMPLETED").length, color:D.red, icon:"⚠" },
        { label:"Total Assets",  value:ASSETS_DATA.length,                                                    color:D.blue,   icon:"◈" },
        { label:"Pending WRs",   value:pendingWRs.length,                                                     color:D.violet, icon:"✦" },
      ];

  return (
    <div>
      {/* Welcome */}
      <div style={{ background:`linear-gradient(135deg, ${D.bg2}, ${D.bg3})`, border:`1px solid ${D.border}`, borderRadius:8, padding:"18px 18px 16px", marginBottom:16, borderLeft:`3px solid ${D.amber}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Avatar initials={user.avatar} />
          <div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:14, fontWeight:700 }}>{user.name}</div>
            <div style={{ color:D.txtMid, fontSize:11, marginTop:2, fontFamily:D.sans }}>
              <Chip label={user.role.toUpperCase()} color={user.role==="admin"?D.violet:user.role==="supervisor"?D.blue:D.green} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...$.card, padding:"14px 14px 12px", borderTop:`2px solid ${s.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ color:D.txtMid, fontSize:9, fontFamily:D.mono, letterSpacing:1.5, textTransform:"uppercase" }}>{s.label}</div>
              <span style={{ color:s.color, fontSize:16, opacity:0.7 }}>{s.icon}</span>
            </div>
            <div style={{ color:s.color, fontSize:30, fontFamily:D.mono, fontWeight:700, lineHeight:1, marginTop:8 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent WOs */}
      <div style={{ marginBottom:12, color:D.txtDim, fontSize:10, fontFamily:D.mono, letterSpacing:2, textTransform:"uppercase" }}>
        {user.role==="technician" ? "MY WORK ORDERS" : "RECENT WORK ORDERS"}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {(user.role==="technician"?myWOs:WORK_ORDERS_DATA).slice(0,3).map(wo => {
          const asset = ASSETS_DATA.find(a=>a.asset_id===wo.asset_id);
          return (
            <div key={wo.wo_id} style={{ ...$.card, padding:"12px 14px", borderLeft:`3px solid ${TYPE_COL[wo.wo_type]||D.txtMid}` }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                <span style={{ color:D.amber, fontFamily:D.mono, fontSize:11, fontWeight:700 }}>{wo.wo_id}</span>
                <WOType t={wo.wo_type} /><Status s={wo.status} /><Priority p={wo.priority} />
              </div>
              <div style={{ color:D.txt, fontSize:12, fontFamily:D.sans, marginBottom:4 }}>{wo.description}</div>
              <div style={{ color:D.txtMid, fontSize:10, fontFamily:D.mono }}>{asset?.asset_name} · Due {wo.due_date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: ASSET SEARCH
// ─────────────────────────────────────────────────────────────────────────────
const STA_COL_ASSET = { ACTIVE:D.green, MAINTENANCE:D.amber, INACTIVE:D.red };

function AssetCard({ asset, onClick, assets }) {
  const at = ASSET_TYPES_DATA.find(t=>t.type_id===asset.asset_type);
  const sc = STA_COL_ASSET[asset.status]||D.txtMid;
  const parent = assets.find(a=>a.asset_id===asset.parent_asset);
  return (
    <div onClick={onClick}
      style={{ ...$.card, padding:"13px 14px", cursor:"pointer", borderLeft:`3px solid ${at?.color||D.txtMid}` }}>
      {/* Row 1: ID · Type · Status */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6, alignItems:"center" }}>
        <span style={{ color:at?.color||D.txtMid, fontFamily:D.mono, fontSize:11, fontWeight:700 }}>{asset.asset_id}</span>
        <Chip label={at?.type_name||asset.asset_type} color={at?.color||D.txtMid} />
        <Chip label={asset.status} color={sc} />
      </div>
      {/* Row 2: Name */}
      <div style={{ color:D.txt, fontSize:13, fontFamily:D.sans, fontWeight:600, marginBottom:5 }}>{asset.asset_name}</div>
      {/* Row 3: Parent · Location */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", fontSize:10, color:D.txtMid, fontFamily:D.mono }}>
        {parent
          ? <span style={{ color:D.sky }}>⬆ {parent.asset_id} — {parent.asset_name}</span>
          : <span style={{ color:D.txtDim }}>⬆ No parent</span>
        }
      </div>
    </div>
  );
}

function AssetSearch({ onSelectAsset, assets }) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [focus, setFocus] = useState(false);

  const results = useMemo(() => {
    return assets.filter(a => {
      if (typeFilter && a.asset_type !== typeFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (q) {
        const lq = q.toLowerCase();
        const parent = assets.find(p=>p.asset_id===a.parent_asset);
        if (!a.asset_id.toLowerCase().includes(lq) &&
            !a.asset_name.toLowerCase().includes(lq) &&
            !a.location.toLowerCase().includes(lq) &&
            !(parent?.asset_name.toLowerCase().includes(lq))) return false;
      }
      return true;
    });
  }, [q, typeFilter, statusFilter, assets]);

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700, marginBottom:4 }}>ASSET SEARCH</div>
        <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans }}>{results.length} of {assets.length} assets</div>
      </div>
      {/* Search bar */}
      <div style={{ position:"relative", marginBottom:10 }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:D.txtDim, fontSize:14 }}>⊕</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ID, name, location, parent…"
          style={{ ...$.input(focus), paddingLeft:36 }}
          onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} />
      </div>
      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...$.input(false), flex:"1 1 140px", fontSize:11 }}>
          <option value="">All Types</option>
          {ASSET_TYPES_DATA.map(t=><option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...$.input(false), flex:"1 1 120px", fontSize:11 }}>
          <option value="">All Statuses</option>
          {["ACTIVE","MAINTENANCE","INACTIVE"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      {/* Results */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {results.map(asset => (
          <AssetCard key={asset.asset_id} asset={asset} assets={assets} onClick={()=>onSelectAsset(asset)} />
        ))}
        {results.length === 0 && <EmptyState icon="⊕" message="NO ASSETS MATCH SEARCH" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: ASSET DETAIL
// ─────────────────────────────────────────────────────────────────────────────
function AssetDetail({ asset, assets, onBack, onSelectAsset }) {
  const at = ASSET_TYPES_DATA.find(t=>t.type_id===asset.asset_type);
  const attrs = TYPE_ATTRS[asset.asset_type] || [];
  const relatedWOs = WORK_ORDERS_DATA.filter(w=>w.asset_id===asset.asset_id);
  const tasks = MAINT_TASKS_DATA.filter(t=>t.asset_type===asset.asset_type);
  const parent = assets.find(a=>a.asset_id===asset.parent_asset);
  const children = assets.filter(a=>a.parent_asset===asset.asset_id);
  const sc = STA_COL_ASSET[asset.status]||D.txtMid;

  return (
    <div>
      <button onClick={onBack} style={{ ...$.btn(D.txtMid), padding:"6px 12px", marginBottom:14, fontSize:11 }}>← Back</button>

      {/* Header card */}
      <div style={{ ...$.card, borderTop:`3px solid ${at?.color||D.amber}`, marginBottom:14 }}>
        <div style={{ ...$.section, background:`${at?.color||D.amber}0a` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:28 }}>{at?.icon}</span>
            <div>
              <div style={{ color:at?.color||D.amber, fontFamily:D.mono, fontSize:11, letterSpacing:1 }}>{asset.asset_id}</div>
              <div style={{ color:D.txt, fontSize:16, fontWeight:700, fontFamily:D.sans }}>{asset.asset_name}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <Chip label={at?.type_name||asset.asset_type} color={at?.color||D.txtMid} />
            <Chip label={asset.status} color={sc} />
          </div>
        </div>

        {/* ── All 10 common fields ── */}
        <div style={{ padding:"8px 14px", background:D.bg3, borderBottom:`1px solid ${D.border}` }}>
          <span style={{ color:D.txtDim, fontSize:9, fontFamily:D.mono, letterSpacing:2 }}>COMMON FIELDS</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>

          {/* asset_id */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}`, borderRight:`1px solid ${D.border}` }}>
            <div style={$.label}>asset_id</div>
            <div style={{ color:D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>{asset.asset_id}</div>
          </div>

          {/* asset_name */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}` }}>
            <div style={$.label}>asset_name</div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{asset.asset_name}</div>
          </div>

          {/* asset_type */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}`, borderRight:`1px solid ${D.border}` }}>
            <div style={$.label}>asset_type</div>
            <div style={{ color:at?.color||D.txtMid, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>{at?.type_name||asset.asset_type}</div>
          </div>

          {/* status */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}` }}>
            <div style={$.label}>status</div>
            <Chip label={asset.status} color={sc} />
          </div>

          {/* parent_asset — full row, linked */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}`, gridColumn:"1 / -1" }}>
            <div style={$.label}>parent_asset</div>
            {parent
              ? <div onClick={()=>onSelectAsset(parent)}
                  style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer",
                    background:D.skyLo, border:`1px solid ${D.sky}44`, borderRadius:5, padding:"6px 12px" }}>
                  <span style={{ color:D.txtMid, fontFamily:D.mono, fontSize:10 }}>{parent.asset_id}</span>
                  <span style={{ color:D.txtDim }}>—</span>
                  <span style={{ color:D.sky, fontFamily:D.sans, fontSize:13, fontWeight:600 }}>{parent.asset_name}</span>
                  <span style={{ color:D.txtDim, fontSize:10 }}>↗</span>
                </div>
              : <span style={{ color:D.txtDim, fontFamily:D.mono, fontSize:12 }}>— No parent (root asset)</span>
            }
          </div>

          {/* location */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}`, borderRight:`1px solid ${D.border}` }}>
            <div style={$.label}>location</div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{asset.location||"—"}</div>
          </div>

          {/* part_number */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}` }}>
            <div style={$.label}>part_number</div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{asset.part_number||"—"}</div>
          </div>

          {/* serial_number */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}`, borderRight:`1px solid ${D.border}` }}>
            <div style={$.label}>serial_number</div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{asset.serial_number||"—"}</div>
          </div>

          {/* vendor */}
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}` }}>
            <div style={$.label}>vendor</div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{asset.vendor||"—"}</div>
          </div>

          {/* manufacturer — full row */}
          <div style={{ padding:"10px 14px", gridColumn:"1 / -1" }}>
            <div style={$.label}>manufacturer</div>
            <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{asset.manufacturer||"—"}</div>
          </div>

        </div>

        {/* ── Dynamic type attributes ── */}
        {attrs.length > 0 && (
          <>
            <div style={{ padding:"8px 14px", background:D.bg3, borderTop:`1px solid ${D.border}`, borderBottom:`1px solid ${D.border}` }}>
              <span style={{ color:D.txtDim, fontSize:9, fontFamily:D.mono, letterSpacing:2 }}>TYPE ATTRIBUTES — {at?.type_name}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
              {attrs.map((attr,i)=>(
                <div key={attr.attr_id} style={{ padding:"10px 14px", borderBottom:`1px solid ${D.border}`, borderRight:i%2===0?`1px solid ${D.border}`:"none" }}>
                  <div style={$.label}>{attr.label}</div>
                  <div style={{ color:at?.color||D.amber, fontFamily:D.mono, fontSize:13, fontWeight:700 }}>
                    {asset.attrs?.[attr.name] ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Child assets ── */}
      {children.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ color:D.txtDim, fontSize:9, fontFamily:D.mono, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
            CHILD ASSETS ({children.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {children.map(child=>(
              <AssetCard key={child.asset_id} asset={child} assets={assets} onClick={()=>onSelectAsset(child)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Related WOs ── */}
      {relatedWOs.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ color:D.txtDim, fontSize:9, fontFamily:D.mono, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>WORK ORDERS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {relatedWOs.map(wo=>(
              <div key={wo.wo_id} style={{ ...$.card, padding:"10px 14px", borderLeft:`3px solid ${TYPE_COL[wo.wo_type]||D.txtMid}` }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                  <span style={{ color:D.amber, fontFamily:D.mono, fontSize:11, fontWeight:700 }}>{wo.wo_id}</span>
                  <WOType t={wo.wo_type} /><Status s={wo.status} />
                </div>
                <div style={{ color:D.txtMid, fontSize:11, fontFamily:D.sans }}>{wo.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Maintenance tasks ── */}
      {tasks.length > 0 && (
        <div>
          <div style={{ color:D.txtDim, fontSize:9, fontFamily:D.mono, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>MAINTENANCE TASKS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {tasks.map(t=>(
              <div key={t.task_id} style={{ ...$.card, padding:"10px 14px" }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                  <Chip label={t.frequency} color={D.blue} />
                  <Safety s={t.safety} />
                  <Chip label={`${t.estimated_duration}m`} color={D.txtMid} />
                </div>
                <div style={{ color:D.txt, fontSize:12, fontFamily:D.sans }}>{t.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: MY WORK ORDERS + DETAIL
// ─────────────────────────────────────────────────────────────────────────────
function MyWorkOrders({ user }) {
  const [selected, setSelected] = useState(null);
  const myWOs = WORK_ORDERS_DATA.filter(w=>user.role==="technician"?w.assigned_to===user.id:true);
  if (selected) return <WODetail wo={selected} user={user} onBack={()=>setSelected(null)} />;
  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700 }}>
          {user.role==="technician"?"MY WORK ORDERS":"ALL WORK ORDERS"}
        </div>
        <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans, marginTop:2 }}>{myWOs.length} work orders</div>
      </div>
      {myWOs.length===0 ? <EmptyState icon="⊞" message="NO WORK ORDERS ASSIGNED" /> :
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {myWOs.map(wo=>{
            const asset=ASSETS_DATA.find(a=>a.asset_id===wo.asset_id);
            const done=wo.checklist.filter(t=>t.done).length; const tot=wo.checklist.length;
            return (
              <div key={wo.wo_id} onClick={()=>setSelected(wo)}
                style={{ ...$.card, padding:"13px 14px", cursor:"pointer", borderLeft:`3px solid ${TYPE_COL[wo.wo_type]||D.txtMid}` }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:7 }}>
                  <span style={{ color:D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>{wo.wo_id}</span>
                  <WOType t={wo.wo_type} /><Status s={wo.status} /><Priority p={wo.priority} />
                </div>
                <div style={{ color:D.txt, fontSize:13, fontFamily:D.sans, marginBottom:6 }}>{wo.description}</div>
                <div style={{ color:D.txtMid, fontSize:10, fontFamily:D.mono, marginBottom:8 }}>
                  📦 {asset?.asset_name} · 📅 {wo.due_date} · ⏱ {wo.estimated_duration}m · <Safety s={wo.safety_condition} />
                </div>
                {tot>0 && (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:9, color:D.txtMid, fontFamily:D.mono }}>
                      <span>CHECKLIST</span><span>{done}/{tot}</span>
                    </div>
                    <div style={{ height:4, background:D.bg4, borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${tot?((done/tot)*100):0}%`, background:done===tot?D.green:D.amber, borderRadius:2 }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

function WODetail({ wo, user, onBack }) {
  const [checklist, setChecklist] = useState(wo.checklist||[]);
  const [timeSpent, setTimeSpent] = useState("");
  const [notes, setNotes] = useState(wo.completion_notes||"");
  const [cmFields, setCmFields] = useState({ problem_description:wo.problem_description||"", diagnosis:wo.diagnosis||"", corrective_action:wo.corrective_action||"" });
  const [submitted, setSubmitted] = useState(false);
  const asset = ASSETS_DATA.find(a=>a.asset_id===wo.asset_id);
  const at = ASSET_TYPES_DATA.find(t=>t.type_id===asset?.asset_type);
  const allDone = checklist.length>0 && checklist.every(t=>t.done);

  const toggle = idx => setChecklist(prev=>prev.map((t,i)=>i===idx?{...t,done:!t.done}:t));

  return (
    <div>
      <button onClick={onBack} style={{ ...$.btn(D.txtMid), padding:"6px 12px", marginBottom:14, fontSize:11 }}>← Back</button>

      {/* Safety banner */}
      <div style={{ background:`${SAF_COL[wo.safety_condition]||D.txtMid}18`, border:`1px solid ${SAF_COL[wo.safety_condition]||D.txtMid}44`, borderRadius:8, padding:"12px 16px", marginBottom:14, display:"flex", gap:10, alignItems:"center" }}>
        <span style={{ fontSize:20 }}>{wo.safety_condition==="LOCKOUT TAGOUT"?"🔒":wo.safety_condition==="DE-ENERGIZED"?"⚡":"▶"}</span>
        <div>
          <div style={{ color:SAF_COL[wo.safety_condition]||D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>SAFETY CONDITION</div>
          <div style={{ color:D.txt, fontSize:14, fontWeight:700, fontFamily:D.sans }}>{wo.safety_condition}</div>
          <div style={{ color:D.txtMid, fontSize:11, fontFamily:D.sans, marginTop:2 }}>Verify safety condition before starting work</div>
        </div>
      </div>

      {/* WO header */}
      <div style={{ ...$.card, marginBottom:14, borderTop:`3px solid ${TYPE_COL[wo.wo_type]||D.amber}` }}>
        <div style={{ ...$.section, background:`${TYPE_COL[wo.wo_type]||D.amber}0a` }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{ color:D.amber, fontFamily:D.mono, fontSize:14, fontWeight:700 }}>{wo.wo_id}</span>
            <WOType t={wo.wo_type} /><Status s={wo.status} /><Priority p={wo.priority} />
          </div>
          <div style={{ color:D.txt, fontSize:14, fontFamily:D.sans, fontWeight:600 }}>{wo.description}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
          {[["Asset",at?.type_name||"—"],["Asset ID",asset?.asset_id||"—"],["Due Date",wo.due_date],["Est. Duration",`${wo.estimated_duration}m`],["Assigned To",USERS.find(u=>u.id===wo.assigned_to)?.name||wo.assigned_to],["Created By",wo.created_by==="System"?"System":USERS.find(u=>u.id===wo.created_by)?.name||wo.created_by]].map(([k,v])=>(
            <div key={k} style={{ padding:"9px 14px", borderBottom:`1px solid ${D.border}`, borderRight:`1px solid ${D.border}` }}>
              <div style={$.label}>{k}</div>
              <div style={{ color:D.txt, fontFamily:D.mono, fontSize:12 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PM Checklist */}
      {wo.wo_type==="PM" && checklist.length>0 && (
        <div style={{ ...$.card, marginBottom:14 }}>
          <div style={{ ...$.section, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:D.green, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>TASK CHECKLIST</div>
            <span style={{ color:allDone?D.green:D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>
              {checklist.filter(t=>t.done).length}/{checklist.length}
            </span>
          </div>
          {checklist.map((task,idx)=>{
            const mt=MAINT_TASKS_DATA.find(t=>t.task_id===task.id);
            return (
              <div key={task.id} onClick={()=>toggle(idx)}
                style={{ padding:"13px 16px", borderBottom:`1px solid ${D.border}`, background:task.done?D.greenLo:"transparent", display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
                <div style={{ width:22, height:22, borderRadius:4, border:`2px solid ${task.done?D.green:D.borderHi}`, background:task.done?D.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", color:D.bg0, fontSize:13, fontWeight:700, flexShrink:0, marginTop:1 }}>
                  {task.done?"✓":""}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:task.done?D.txtMid:D.txt, fontSize:13, fontFamily:D.sans, textDecoration:task.done?"line-through":"none" }}>
                    {mt?.description||task.id}
                  </div>
                  {mt && <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}><Chip label={mt.frequency} color={D.blue}/><Safety s={mt.safety}/><Chip label={`${mt.estimated_duration}m`} color={D.txtMid}/></div>}
                  {task.notes && <div style={{ color:D.green, fontSize:11, fontFamily:D.mono, marginTop:4 }}>✓ {task.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CM fields */}
      {wo.wo_type==="CM" && (
        <div style={{ ...$.card, marginBottom:14 }}>
          <div style={{ ...$.section, background:D.redLo }}>
            <div style={{ color:D.red, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>FAILURE REPORT</div>
          </div>
          <div style={{ padding:16 }}>
            <Input label="Problem Description" type="textarea" value={cmFields.problem_description} onChange={v=>setCmFields(p=>({...p,problem_description:v}))} placeholder="Describe the failure or issue…" required />
            <Input label="Root Cause Diagnosis" type="textarea" value={cmFields.diagnosis} onChange={v=>setCmFields(p=>({...p,diagnosis:v}))} placeholder="Root cause analysis…" />
            <Input label="Corrective Action Taken" type="textarea" value={cmFields.corrective_action} onChange={v=>setCmFields(p=>({...p,corrective_action:v}))} placeholder="Steps taken to resolve…" />
          </div>
        </div>
      )}

      {/* Completion */}
      {wo.status!=="COMPLETED" && !submitted && (
        <div style={{ ...$.card, padding:16 }}>
          <div style={{ color:D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700, marginBottom:14 }}>COMPLETE WORK ORDER</div>
          <Input label="Time Spent (minutes)" type="number" value={timeSpent} onChange={setTimeSpent} placeholder="120" required />
          <Input label="Completion Notes" type="textarea" value={notes} onChange={setNotes} placeholder="Work performed, observations, recommendations…" />
          <button onClick={()=>{ if(!timeSpent){return;} setSubmitted(true); }}
            style={{ ...$.btn(wo.wo_type==="PM"&&checklist.length>0&&!allDone?D.txtMid:D.green, true), padding:"12px 0", opacity:wo.wo_type==="PM"&&checklist.length>0&&!allDone?0.5:1 }}>
            {wo.wo_type==="PM"&&checklist.length>0&&!allDone ? `Complete ${checklist.filter(t=>!t.done).length} Remaining Tasks First` : "✓ Submit Completion"}
          </button>
        </div>
      )}
      {submitted && (
        <div style={{ ...$.card, padding:20, textAlign:"center", background:D.greenLo, borderColor:`${D.green}44` }}>
          <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
          <div style={{ color:D.green, fontFamily:D.mono, fontSize:14, fontWeight:700 }}>WORK ORDER COMPLETED</div>
          <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans, marginTop:4 }}>Submitted successfully · Time: {timeSpent}m</div>
        </div>
      )}
      {wo.status==="COMPLETED" && (
        <div style={{ ...$.card, padding:"12px 16px", background:D.greenLo, borderColor:`${D.green}44` }}>
          <div style={{ color:D.green, fontFamily:D.mono, fontSize:11, fontWeight:700 }}>✓ COMPLETED · {wo.completion_date} · Actual: {wo.actual_duration}m</div>
          {wo.completion_notes && <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans, marginTop:4 }}>{wo.completion_notes}</div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: WORK REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
function WorkRequestsPage({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState(WORK_REQUESTS_DATA);
  const [form, setForm] = useState({ asset_id:"", description:"", priority:"MEDIUM" });
  const [focus, setFocus] = useState(null);
  const myReqs = user.role==="technician" ? requests.filter(r=>r.requested_by===user.id) : requests;

  const submit = () => {
    if (!form.asset_id||!form.description) return;
    const wr = {
      wr_id:`WR-${String(requests.length+1).padStart(6,"0")}`,
      asset_id:form.asset_id, asset_name:form.asset_id,
      description:form.description, priority:form.priority,
      requested_by:user.id, request_date:new Date().toISOString().slice(0,10),
      status:"PENDING", converted_to_wo:"",
    };
    setRequests(p=>[wr,...p]);
    setForm({ asset_id:"", description:"", priority:"MEDIUM" });
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700 }}>WORK REQUESTS</div>
          <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans, marginTop:2 }}>{myReqs.length} requests</div>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ ...$.btn(D.sky), padding:"8px 14px" }}>+ New</button>
      </div>

      {showForm && (
        <div style={{ ...$.card, padding:16, marginBottom:16, borderTop:`2px solid ${D.sky}` }}>
          <div style={{ color:D.sky, fontFamily:D.mono, fontSize:12, fontWeight:700, marginBottom:14 }}>SUBMIT WORK REQUEST</div>
          <Input label="Asset ID *" value={form.asset_id} onChange={v=>setForm(p=>({...p,asset_id:v}))} placeholder="AST-000001" required />
          <Input label="Problem Description *" type="textarea" value={form.description} onChange={v=>setForm(p=>({...p,description:v}))} placeholder="Describe the issue observed…" required />
          <Input label="Priority" type="select" value={form.priority} onChange={v=>setForm(p=>({...p,priority:v}))} options={["CRITICAL","HIGH","MEDIUM","LOW"]} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} style={{ ...$.btn(D.sky), flex:1 }}>Submit</button>
            <button onClick={()=>setShowForm(false)} style={{ ...$.btn(D.txtMid) }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {myReqs.map(wr => (
          <div key={wr.wr_id} style={{ ...$.card, padding:"13px 14px", borderLeft:`3px solid ${PRI_COL[wr.priority]||D.txtMid}` }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6, alignItems:"center" }}>
              <span style={{ color:D.sky, fontFamily:D.mono, fontSize:11, fontWeight:700 }}>{wr.wr_id}</span>
              <Priority p={wr.priority} /><WRStatus s={wr.status} />
              {wr.converted_to_wo && <Chip label={`→ ${wr.converted_to_wo}`} color={D.green} />}
            </div>
            <div style={{ color:D.txt, fontSize:13, fontFamily:D.sans, marginBottom:6 }}>{wr.description}</div>
            <div style={{ color:D.txtMid, fontSize:10, fontFamily:D.mono }}>
              📦 {wr.asset_name} · 👤 {USERS.find(u=>u.id===wr.requested_by)?.name||wr.requested_by} · 📅 {wr.request_date}
            </div>
            {user.role==="supervisor" && wr.status==="PENDING" && (
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button onClick={()=>setRequests(p=>p.map(r=>r.wr_id===wr.wr_id?{...r,status:"REVIEWED"}:r))}
                  style={{ ...$.btn(D.blue), fontSize:10, padding:"5px 10px" }}>Review</button>
                <button onClick={()=>setRequests(p=>p.map(r=>r.wr_id===wr.wr_id?{...r,status:"CONVERTED",converted_to_wo:"WO-NEW"}:r))}
                  style={{ ...$.btn(D.green), fontSize:10, padding:"5px 10px" }}>→ Convert to CM WO</button>
              </div>
            )}
          </div>
        ))}
        {myReqs.length===0 && <EmptyState icon="✦" message="NO WORK REQUESTS" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: ASSET MANAGEMENT (Supervisor)
// ─────────────────────────────────────────────────────────────────────────────
function AssetManagement({ onSelectAsset, assets, setAssets }) {
  const [showForm, setShowForm] = useState(false);
  const [selType, setSelType] = useState("");
  const [form, setForm] = useState({
    asset_name:"", parent_asset:"", location:"",
    manufacturer:"", vendor:"", part_number:"", serial_number:"", status:"ACTIVE",
  });
  const [attrVals, setAttrVals] = useState({});
  const attrs = TYPE_ATTRS[selType]||[];

  const createAsset = () => {
    if (!selType || !form.asset_name) return;
    const nextNum = String(assets.length + 1).padStart(6, "0");
    const newAsset = {
      asset_id: `AST-${nextNum}`,
      asset_type: selType,
      ...form,
      attrs: attrVals,
    };
    setAssets(prev => [...prev, newAsset]);
    setForm({ asset_name:"", parent_asset:"", location:"", manufacturer:"", vendor:"", part_number:"", serial_number:"", status:"ACTIVE" });
    setAttrVals({});
    setSelType("");
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700 }}>ASSET MANAGEMENT</div>
          <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans, marginTop:2 }}>{assets.length} assets registered</div>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ ...$.btn(D.amber), padding:"8px 14px" }}>+ New Asset</button>
      </div>

      {showForm && (
        <div style={{ ...$.card, padding:16, marginBottom:16, borderTop:`2px solid ${D.amber}` }}>
          <div style={{ color:D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700, marginBottom:14 }}>CREATE ASSET</div>

          <Divider label="Common Fields" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {/* asset_type */}
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={$.label}>asset_type *</label>
              <select value={selType} onChange={e=>{setSelType(e.target.value);setAttrVals({});}} style={$.input(false)}>
                <option value="">Select type…</option>
                {ASSET_TYPES_DATA.map(t=><option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
              </select>
            </div>
            {/* asset_name */}
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={$.label}>asset_name *</label>
              <input value={form.asset_name} onChange={e=>setForm(p=>({...p,asset_name:e.target.value}))} style={$.input(false)} placeholder="e.g. Pump Motor P-202" />
            </div>
            {/* parent_asset — dropdown from existing assets */}
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={$.label}>parent_asset</label>
              <select value={form.parent_asset} onChange={e=>setForm(p=>({...p,parent_asset:e.target.value}))} style={$.input(false)}>
                <option value="">— None (root asset)</option>
                {assets.map(a=>(
                  <option key={a.asset_id} value={a.asset_id}>
                    {a.asset_id} — {a.asset_name}
                  </option>
                ))}
              </select>
              {form.parent_asset && (
                <div style={{ marginTop:5, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:D.txtDim, fontSize:10, fontFamily:D.mono }}>Linked to:</span>
                  <span style={$.badge(D.sky)}>
                    {assets.find(a=>a.asset_id===form.parent_asset)?.asset_name}
                  </span>
                </div>
              )}
            </div>
            {/* location */}
            <div>
              <label style={$.label}>location *</label>
              <input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} style={$.input(false)} placeholder="Building 2 - Bay 1" />
            </div>
            {/* status */}
            <div>
              <label style={$.label}>status</label>
              <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={$.input(false)}>
                {["ACTIVE","MAINTENANCE","INACTIVE"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {/* manufacturer */}
            <div>
              <label style={$.label}>manufacturer</label>
              <input value={form.manufacturer} onChange={e=>setForm(p=>({...p,manufacturer:e.target.value}))} style={$.input(false)} />
            </div>
            {/* vendor */}
            <div>
              <label style={$.label}>vendor</label>
              <input value={form.vendor} onChange={e=>setForm(p=>({...p,vendor:e.target.value}))} style={$.input(false)} />
            </div>
            {/* part_number */}
            <div>
              <label style={$.label}>part_number</label>
              <input value={form.part_number} onChange={e=>setForm(p=>({...p,part_number:e.target.value}))} style={$.input(false)} />
            </div>
            {/* serial_number */}
            <div>
              <label style={$.label}>serial_number</label>
              <input value={form.serial_number} onChange={e=>setForm(p=>({...p,serial_number:e.target.value}))} style={$.input(false)} />
            </div>
          </div>

          {/* Dynamic type attributes */}
          {selType && attrs.length > 0 && (
            <>
              <Divider label={`${ASSET_TYPES_DATA.find(t=>t.type_id===selType)?.type_name} Attributes`} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {attrs.map(attr=>(
                  <div key={attr.attr_id}>
                    <label style={$.label}>{attr.label}{attr.required?" *":""}</label>
                    {attr.type==="select"
                      ? <select value={attrVals[attr.name]||""} onChange={e=>setAttrVals(p=>({...p,[attr.name]:e.target.value}))} style={$.input(false)}>
                          <option value="">Select…</option>
                          {attr.options.map(o=><option key={o}>{o}</option>)}
                        </select>
                      : <input type={attr.type} value={attrVals[attr.name]||""} onChange={e=>setAttrVals(p=>({...p,[attr.name]:e.target.value}))} style={$.input(false)} />
                    }
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <button onClick={createAsset} style={{ ...$.btn(D.amber), flex:1 }}>Create Asset</button>
            <button onClick={()=>setShowForm(false)} style={{ ...$.btn(D.txtMid) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Asset list using shared AssetCard */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {assets.map(asset => (
          <AssetCard key={asset.asset_id} asset={asset} assets={assets} onClick={()=>onSelectAsset(asset)} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: CSV IMPORT (Supervisor)
// ─────────────────────────────────────────────────────────────────────────────
function CSVImport() {
  const [stage, setStage] = useState("upload"); // upload | preview | result
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [mapping, setMapping] = useState({});
  const fileRef = useRef();

  const REQUIRED_HEADERS = ["asset_name","asset_type","location"];
  const ALL_FIELDS = ["asset_name","asset_type","location","manufacturer","vendor","part_number","serial_number","status"];

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
    const rows = lines.slice(1).map(l => {
      const vals = l.split(",").map(v=>v.trim().replace(/"/g,""));
      return Object.fromEntries(headers.map((h,i)=>[h,vals[i]||""]));
    });

    // Auto-map headers
    const autoMap = {};
    headers.forEach(h => {
      const match = ALL_FIELDS.find(f=>f.toLowerCase()===h.toLowerCase()||f.includes(h.toLowerCase()));
      if (match) autoMap[h] = match;
    });
    setMapping(autoMap);

    // Validate
    const errs = [];
    REQUIRED_HEADERS.forEach(req => {
      if (!headers.some(h=>h.toLowerCase()===req.toLowerCase())) errs.push(`Missing required column: ${req}`);
    });
    rows.forEach((row,i) => {
      if (!row[headers[0]]) errs.push(`Row ${i+2}: Empty asset_name`);
    });

    setErrors(errs);
    setPreview(rows.slice(0,10));
    setStage("preview");
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseCSV(ev.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseCSV(ev.target.result);
    reader.readAsText(file);
  };

  // Demo data
  const demoCSV = `asset_name,asset_type,location,manufacturer,horsepower,voltage
Fan Motor F-010,MOT,Cooling Tower - Bay 3,WEG,20,460
Panel EP-20,EPL,Building 2 - Rm 1,Schneider,,480
Disconnect LDC-04,LDC,Area B,Eaton,,`;

  return (
    <div>
      <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700, marginBottom:4 }}>CSV IMPORT</div>
      <div style={{ color:D.txtMid, fontSize:12, fontFamily:D.sans, marginBottom:16 }}>Import assets from spreadsheet</div>

      {stage==="upload" && (
        <>
          <div onClick={()=>fileRef.current.click()} onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
            style={{ border:`2px dashed ${D.borderHi}`, borderRadius:8, padding:"36px 20px", textAlign:"center", cursor:"pointer", marginBottom:16, background:D.bg2 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⇡</div>
            <div style={{ color:D.txt, fontSize:14, fontFamily:D.sans, marginBottom:4 }}>Drop CSV file or click to browse</div>
            <div style={{ color:D.txtDim, fontSize:11, fontFamily:D.mono }}>CSV format · UTF-8 encoding</div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={handleFile} />
          </div>
          <div style={{ ...$.card, padding:16, marginBottom:14 }}>
            <div style={{ color:D.txtDim, fontSize:10, fontFamily:D.mono, letterSpacing:1.5, marginBottom:10 }}>REQUIRED COLUMNS</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {REQUIRED_HEADERS.map(h=><Chip key={h} label={h} color={D.amber}/>)}
            </div>
            <div style={{ color:D.txtDim, fontSize:10, fontFamily:D.mono, letterSpacing:1.5, marginTop:12, marginBottom:8 }}>OPTIONAL COLUMNS</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["manufacturer","vendor","part_number","serial_number","status"].map(h=><Chip key={h} label={h} color={D.txtMid}/>)}
            </div>
          </div>
          <button onClick={()=>parseCSV(demoCSV)} style={{ ...$.btn(D.blue,true) }}>Load Demo CSV</button>
        </>
      )}

      {stage==="preview" && (
        <>
          {errors.length>0 && (
            <div style={{ background:D.redLo, border:`1px solid ${D.red}44`, borderRadius:8, padding:14, marginBottom:14 }}>
              <div style={{ color:D.red, fontFamily:D.mono, fontSize:12, fontWeight:700, marginBottom:8 }}>⚠ VALIDATION ERRORS ({errors.length})</div>
              {errors.map((e,i)=><div key={i} style={{ color:D.red, fontSize:11, fontFamily:D.sans, marginBottom:4 }}>• {e}</div>)}
            </div>
          )}

          {/* Column mapping */}
          <div style={{ ...$.card, padding:14, marginBottom:14 }}>
            <div style={{ color:D.amber, fontFamily:D.mono, fontSize:11, fontWeight:700, marginBottom:12 }}>COLUMN MAPPING</div>
            {Object.keys(preview[0]||{}).map(col=>(
              <div key={col} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                <span style={{ color:D.txtMid, fontFamily:D.mono, fontSize:11, flex:"0 0 140px" }}>{col}</span>
                <span style={{ color:D.txtDim, fontSize:12 }}>→</span>
                <select value={mapping[col]||""} onChange={e=>setMapping(p=>({...p,[col]:e.target.value}))} style={{ ...$.input(false), fontSize:11 }}>
                  <option value="">(skip)</option>
                  {ALL_FIELDS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div style={{ color:D.txtDim, fontSize:10, fontFamily:D.mono, letterSpacing:2, marginBottom:8 }}>DATA PREVIEW ({preview.length} rows)</div>
          <div style={{ ...$.card, overflowX:"auto", marginBottom:14 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, whiteSpace:"nowrap" }}>
              <thead>
                <tr style={{ background:D.bg3 }}>
                  {Object.keys(preview[0]||{}).map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:D.txtDim, fontFamily:D.mono, fontSize:9, letterSpacing:1, fontWeight:400, borderBottom:`1px solid ${D.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${D.border}`, background:i%2===0?"transparent":D.bg1 }}>
                    {Object.values(row).map((v,j)=>(
                      <td key={j} style={{ padding:"8px 12px", color:D.txt, fontFamily:D.mono }}>{v||<span style={{ color:D.txtDim }}>—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setStage("result")} style={{ ...$.btn(errors.length?D.txtMid:D.green), flex:1, opacity:errors.length?0.5:1 }}>
              Import {preview.length} Assets
            </button>
            <button onClick={()=>setStage("upload")} style={{ ...$.btn(D.txtMid) }}>Back</button>
          </div>
        </>
      )}

      {stage==="result" && (
        <div style={{ textAlign:"center", padding:30 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✓</div>
          <div style={{ color:D.green, fontFamily:D.mono, fontSize:16, fontWeight:700 }}>IMPORT COMPLETE</div>
          <div style={{ color:D.txtMid, fontSize:13, fontFamily:D.sans, marginTop:6, marginBottom:20 }}>{preview.length} assets imported successfully</div>
          <button onClick={()=>{ setStage("upload"); setPreview([]); setErrors([]); }} style={{ ...$.btn(D.amber,false), margin:"0 auto" }}>Import Another File</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: USER MANAGEMENT (Admin)
// ─────────────────────────────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState(USERS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", role:"technician", password:"" });
  const ROLE_COL = { admin:D.violet, supervisor:D.blue, technician:D.green };

  const add = () => {
    if (!form.name||!form.email) return;
    setUsers(p=>[...p,{ id:`U00${p.length+1}`, ...form, avatar:form.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) }]);
    setForm({ name:"", email:"", role:"technician", password:"" });
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700 }}>USER MANAGEMENT</div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ ...$.btn(D.violet), padding:"8px 14px" }}>+ User</button>
      </div>
      {showForm && (
        <div style={{ ...$.card, padding:16, marginBottom:16, borderTop:`2px solid ${D.violet}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={$.label}>Full Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={$.input(false)} /></div>
            <div><label style={$.label}>Email *</label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={$.input(false)} /></div>
            <div>
              <label style={$.label}>Role</label>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={$.input(false)}>
                {["technician","supervisor","admin"].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={$.label}>Password</label><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} style={$.input(false)} /></div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={add} style={{ ...$.btn(D.violet), flex:1 }}>Create User</button>
            <button onClick={()=>setShowForm(false)} style={{ ...$.btn(D.txtMid) }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {users.map(u=>(
          <div key={u.id} style={{ ...$.card, padding:"12px 14px", display:"flex", gap:12, alignItems:"center" }}>
            <Avatar initials={u.avatar} color={ROLE_COL[u.role]} />
            <div style={{ flex:1 }}>
              <div style={{ color:D.txt, fontSize:13, fontFamily:D.sans, fontWeight:600 }}>{u.name}</div>
              <div style={{ color:D.txtMid, fontSize:11, fontFamily:D.mono, marginTop:2 }}>{u.email}</div>
            </div>
            <Chip label={u.role.toUpperCase()} color={ROLE_COL[u.role]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: ASSET TYPE CONFIG (Admin)
// ─────────────────────────────────────────────────────────────────────────────
function AssetTypeConfig() {
  const [selected, setSelected] = useState("MOT");
  const [types, setTypes] = useState(ASSET_TYPES_DATA);
  const at = types.find(t=>t.type_id===selected);
  const attrs = TYPE_ATTRS[selected]||[];
  const subtypes = ASSET_SUBTYPES_DATA.filter(s=>s.parent_type_id===selected);

  return (
    <div>
      <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700, marginBottom:16 }}>ASSET TYPE CONFIGURATION</div>
      {/* Type selector */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {types.map(t=>(
          <button key={t.type_id} onClick={()=>setSelected(t.type_id)} style={{
            ...$.btn(selected===t.type_id?t.color:D.txtMid),
            background:selected===t.type_id?`${t.color}18`:"transparent",
            borderColor:selected===t.type_id?t.color:D.border,
            padding:"6px 12px", fontSize:10,
          }}>
            {t.icon} {t.type_name.replace(" High Voltage","").replace(" Low Voltage","")}
          </button>
        ))}
      </div>

      {at && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Attributes */}
          <div style={{ ...$.card }}>
            <div style={{ ...$.section, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:at.color, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>{at.icon} {at.type_name} — ATTRIBUTES</span>
              <button style={{ ...$.btn(at.color), padding:"4px 10px", fontSize:9 }}>+ Attribute</button>
            </div>
            {attrs.length===0 ? <EmptyState icon="▦" message="NO ATTRIBUTES DEFINED" /> :
              attrs.map(attr=>(
                <div key={attr.attr_id} style={{ padding:"11px 16px", borderBottom:`1px solid ${D.border}`, display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ color:D.txt, fontSize:12, fontFamily:D.sans }}>{attr.label}</div>
                    <div style={{ color:D.txtDim, fontSize:10, fontFamily:D.mono, marginTop:2 }}>
                      {attr.name} · {attr.type} {attr.required?"· required":""}
                    </div>
                  </div>
                  <Chip label={attr.type} color={D.blue} />
                  {attr.required && <Chip label="REQUIRED" color={D.amber} />}
                </div>
              ))
            }
          </div>
          {/* Subtypes */}
          <div style={{ ...$.card }}>
            <div style={{ ...$.section, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:at.color, fontFamily:D.mono, fontSize:12, fontWeight:700 }}>SUBTYPES</span>
              <button style={{ ...$.btn(at.color), padding:"4px 10px", fontSize:9 }}>+ Subtype</button>
            </div>
            {subtypes.length===0 ? <EmptyState icon="⋈" message="NO SUBTYPES DEFINED" /> :
              subtypes.map(st=>(
                <div key={st.subtype_id} style={{ padding:"11px 16px", borderBottom:`1px solid ${D.border}` }}>
                  <div style={{ color:D.txt, fontSize:12, fontFamily:D.sans }}>{st.subtype_name}</div>
                  <div style={{ color:D.txtDim, fontSize:10, fontFamily:D.mono, marginTop:2 }}>{st.condition}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: MAINTENANCE TASKS (Admin)
// ─────────────────────────────────────────────────────────────────────────────
function MaintenanceTasks() {
  const [tasks, setTasks] = useState(MAINT_TASKS_DATA);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState({ asset_type:"MOT", description:"", frequency:"Monthly", safety:"DE-ENERGIZED", estimated_duration:"" });

  const FREQ_COL = { Daily:D.red, Weekly:D.orange, Monthly:D.amber, Quarterly:D.green, "Semi-Annual":D.blue, Annual:D.violet };
  const filtered = tasks.filter(t=>!typeFilter||t.asset_type===typeFilter);

  const add = () => {
    if (!form.description) return;
    setTasks(p=>[...p,{ task_id:`MT${String(p.length+1).padStart(3,"0")}`, ...form, subtype:"" }]);
    setForm({ asset_type:"MOT", description:"", frequency:"Monthly", safety:"DE-ENERGIZED", estimated_duration:"" });
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700 }}>MAINTENANCE TASKS</div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ ...$.btn(D.green), padding:"8px 14px" }}>+ Task</button>
      </div>
      {showForm && (
        <div style={{ ...$.card, padding:16, marginBottom:16, borderTop:`2px solid ${D.green}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={$.label}>Asset Type</label>
              <select value={form.asset_type} onChange={e=>setForm(p=>({...p,asset_type:e.target.value}))} style={$.input(false)}>
                {ASSET_TYPES_DATA.map(t=><option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Frequency</label>
              <select value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))} style={$.input(false)}>
                {["Daily","Weekly","Monthly","Quarterly","Semi-Annual","Annual","Custom"].map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Safety Condition</label>
              <select value={form.safety} onChange={e=>setForm(p=>({...p,safety:e.target.value}))} style={$.input(false)}>
                {["RUNNING","DE-ENERGIZED","LOCKOUT TAGOUT"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Est. Duration (min)</label>
              <input type="number" value={form.estimated_duration} onChange={e=>setForm(p=>({...p,estimated_duration:e.target.value}))} style={$.input(false)} />
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <label style={$.label}>Task Description *</label>
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
              style={{ ...$.input(false), resize:"vertical", fontFamily:D.sans }} />
          </div>
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={add} style={{ ...$.btn(D.green), flex:1 }}>Add Task</button>
            <button onClick={()=>setShowForm(false)} style={{ ...$.btn(D.txtMid) }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ marginBottom:12 }}>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...$.input(false), fontSize:11 }}>
          <option value="">All Asset Types</option>
          {ASSET_TYPES_DATA.map(t=><option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
        </select>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(task=>{
          const at = ASSET_TYPES_DATA.find(t=>t.type_id===task.asset_type);
          return (
            <div key={task.task_id} style={{ ...$.card, padding:"12px 14px", borderLeft:`3px solid ${at?.color||D.txtMid}` }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                <span style={{ color:D.txtDim, fontFamily:D.mono, fontSize:10 }}>{task.task_id}</span>
                <Chip label={at?.type_name||task.asset_type} color={at?.color||D.txtMid} />
                <Chip label={task.frequency} color={FREQ_COL[task.frequency]||D.txtMid} />
                <Safety s={task.safety} />
                <Chip label={`${task.estimated_duration}m`} color={D.txtMid} />
              </div>
              <div style={{ color:D.txt, fontSize:12, fontFamily:D.sans }}>{task.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN WORK ORDERS (Supervisor)
// ─────────────────────────────────────────────────────────────────────────────
function AssignWorkOrders() {
  const [wos, setWos] = useState(WORK_ORDERS_DATA);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ wo_type:"PM", asset_id:"", assigned_to:"", priority:"MEDIUM", due_date:"", description:"", safety_condition:"DE-ENERGIZED", estimated_duration:"" });
  const WO_TYPE_OPT = [{ id:"PM", label:"Preventive Maintenance" },{ id:"CM", label:"Corrective Maintenance" },{ id:"PRJ", label:"Project" }];

  const create = () => {
    if (!form.asset_id||!form.description) return;
    const wo = {
      wo_id:`WO-${String(wos.length+1).padStart(6,"0")}`,
      ...form, created_by:"U002", status:"OPEN", actual_duration:null,
      completion_notes:"", problem_description:"", diagnosis:"", corrective_action:"",
      checklist:[],
    };
    setWos(p=>[wo,...p]);
    setShowCreate(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ color:D.txt, fontFamily:D.mono, fontSize:15, fontWeight:700 }}>WORK ORDER MANAGEMENT</div>
        <button onClick={()=>setShowCreate(s=>!s)} style={{ ...$.btn(D.amber), padding:"8px 14px" }}>+ Create WO</button>
      </div>

      {showCreate && (
        <div style={{ ...$.card, padding:16, marginBottom:16, borderTop:`2px solid ${D.amber}` }}>
          <div style={{ color:D.amber, fontFamily:D.mono, fontSize:12, fontWeight:700, marginBottom:14 }}>CREATE WORK ORDER</div>
          {/* WO Type */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {WO_TYPE_OPT.map(t=>(
              <button key={t.id} onClick={()=>setForm(p=>({...p,wo_type:t.id}))}
                style={{ ...$.btn(form.wo_type===t.id?TYPE_COL[t.id]:D.txtMid), flex:1, padding:"8px 0", fontSize:10,
                  background:form.wo_type===t.id?`${TYPE_COL[t.id]}18`:"transparent",
                  borderColor:form.wo_type===t.id?TYPE_COL[t.id]:D.border }}>
                {TYPE_ICON[t.id]} {t.id}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={$.label}>Asset ID *</label>
              <select value={form.asset_id} onChange={e=>setForm(p=>({...p,asset_id:e.target.value}))} style={$.input(false)}>
                <option value="">Select asset…</option>
                {ASSETS_DATA.map(a=><option key={a.asset_id} value={a.asset_id}>{a.asset_id} — {a.asset_name}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Assign To</label>
              <select value={form.assigned_to} onChange={e=>setForm(p=>({...p,assigned_to:e.target.value}))} style={$.input(false)}>
                <option value="">Select technician…</option>
                {USERS.filter(u=>u.role==="technician").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Priority</label>
              <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={$.input(false)}>
                {["CRITICAL","HIGH","MEDIUM","LOW"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={$.input(false)} />
            </div>
            <div>
              <label style={$.label}>Safety Condition</label>
              <select value={form.safety_condition} onChange={e=>setForm(p=>({...p,safety_condition:e.target.value}))} style={$.input(false)}>
                {["RUNNING","DE-ENERGIZED","LOCKOUT TAGOUT"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={$.label}>Est. Duration (min)</label>
              <input type="number" value={form.estimated_duration} onChange={e=>setForm(p=>({...p,estimated_duration:e.target.value}))} style={$.input(false)} />
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <label style={$.label}>Description *</label>
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
              style={{ ...$.input(false), resize:"vertical", fontFamily:D.sans }} />
          </div>
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={create} style={{ ...$.btn(D.amber), flex:1 }}>Create Work Order</button>
            <button onClick={()=>setShowCreate(false)} style={{ ...$.btn(D.txtMid) }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {wos.map(wo=>{
          const tech = USERS.find(u=>u.id===wo.assigned_to);
          const asset = ASSETS_DATA.find(a=>a.asset_id===wo.asset_id);
          return (
            <div key={wo.wo_id} style={{ ...$.card, padding:"12px 14px", borderLeft:`3px solid ${TYPE_COL[wo.wo_type]||D.txtMid}` }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                <span style={{ color:D.amber, fontFamily:D.mono, fontSize:11, fontWeight:700 }}>{wo.wo_id}</span>
                <WOType t={wo.wo_type}/><Status s={wo.status}/><Priority p={wo.priority}/>
              </div>
              <div style={{ color:D.txt, fontSize:12, fontFamily:D.sans, marginBottom:5 }}>{wo.description}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", fontSize:10, color:D.txtMid, fontFamily:D.mono }}>
                <span>📦 {asset?.asset_name||wo.asset_id}</span>
                <span>👤 {tech?.name||"Unassigned"}</span>
                <span>📅 {wo.due_date}</span>
                {wo.safety_condition && <Safety s={wo.safety_condition}/>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [assetDetailTarget, setAssetDetailTarget] = useState(null);
  const [assetDetailBackPage, setAssetDetailBackPage] = useState("asset-search");
  const [themeName, setThemeName] = useState("dark");
  const [themeKey, setThemeKey] = useState(0); // force re-render on toggle

  // Keep module-level D in sync
  D = THEMES[themeName];
  $ = mk$(D);
  const colors = getColors(D);
  TYPE_COL = colors.TYPE_COL;
  PRI_COL  = colors.PRI_COL;
  STA_COL  = colors.STA_COL;
  WR_COL   = colors.WR_COL;
  SAF_COL  = colors.SAF_COL;

  const toggleTheme = () => {
    const next = themeName==="dark"?"light":"dark";
    setThemeName(next);
    setThemeKey(k=>k+1);
  };

  // Shared mutable asset list — single source of truth
  const [assets, setAssets] = useState(ASSETS_DATA);

  const menuItems = user ? getMenuItems(user.role) : [];
  const ROLE_COL = { admin:D.violet, supervisor:D.blue, technician:D.green };

  const navigate = (id) => { setPage(id); setMenuOpen(false); setAssetDetailTarget(null); };

  const handleSelectAsset = (asset, backPage) => {
    setAssetDetailTarget(asset);
    setAssetDetailBackPage(backPage || page);
    setPage("asset-detail");
  };

  if (!user) return (
    <LoginPage
      onLogin={u=>{ setUser(u); setPage("dashboard"); }}
      themeName={themeName}
      onToggleTheme={toggleTheme}
    />
  );

  const renderPage = () => {
    if (page==="asset-detail" && assetDetailTarget) {
      // Re-find asset from live state so it reflects any updates
      const liveAsset = assets.find(a=>a.asset_id===assetDetailTarget.asset_id) || assetDetailTarget;
      return (
        <AssetDetail
          asset={liveAsset}
          assets={assets}
          onBack={()=>{ setPage(assetDetailBackPage); setAssetDetailTarget(null); }}
          onSelectAsset={(a)=>handleSelectAsset(a,"asset-detail")}
        />
      );
    }
    switch(page) {
      case "dashboard":     return <Dashboard user={user} />;
      case "asset-search":  return <AssetSearch assets={assets} onSelectAsset={(a)=>handleSelectAsset(a,"asset-search")} />;
      case "my-workorders": return <MyWorkOrders user={user} />;
      case "work-requests": return <WorkRequestsPage user={user} />;
      case "asset-mgmt":    return <AssetManagement assets={assets} setAssets={setAssets} onSelectAsset={(a)=>handleSelectAsset(a,"asset-mgmt")} />;
      case "assign-wo":     return <AssignWorkOrders />;
      case "csv-import":    return <CSVImport />;
      case "user-mgmt":     return <UserManagement />;
      case "asset-types":   return <AssetTypeConfig />;
      case "maint-tasks":   return <MaintenanceTasks />;
      default:              return <Dashboard user={user} />;
    }
  };

  return (
    <div key={themeKey} style={{ background:D.bg0, minHeight:"100vh", fontFamily:D.sans, maxWidth:480, margin:"0 auto", position:"relative", color:D.txt }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box; transition:background-color 0.2s, border-color 0.2s, color 0.15s;}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:${D.bg1}} ::-webkit-scrollbar-thumb{background:${D.borderHi};border-radius:2px}
        select option{background:${D.bg3};color:${D.txt}} textarea,input,select{color-scheme:${D.scheme}}
        button:hover{filter:brightness(1.1)}
      `}</style>

      {/* Top Bar */}
      <div style={{ position:"sticky", top:0, zIndex:200, background:D.bg1, borderBottom:`1px solid ${D.border}`, display:"flex", alignItems:"center", padding:"0 14px", height:50 }}>
        <button onClick={()=>setMenuOpen(o=>!o)} style={{ background:"none", border:"none", color:D.amber, fontSize:18, cursor:"pointer", padding:"4px 6px", marginRight:10, lineHeight:1 }}>
          {menuOpen?"✕":"≡"}
        </button>
        <div style={{ flex:1 }}>
          <div style={{ color:D.acc, fontFamily:D.mono, fontSize:12, fontWeight:700, letterSpacing:2 }}>⚡ CMMS</div>
        </div>
        <button onClick={toggleTheme} style={{ background:"none", border:`1px solid ${D.border}`,
          borderRadius:5, color:D.txtMid, padding:"4px 10px", cursor:"pointer",
          fontFamily:D.mono, fontSize:10, marginRight:8 }}>
          {themeName==="dark"?"☀":"◑"}
        </button>
        <Avatar initials={user.avatar} color={ROLE_COL[user.role]} size={30} />
      </div>

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div onClick={()=>setMenuOpen(false)} style={{ position:"fixed", inset:0, background:"#000a", zIndex:290 }} />
          <div style={{ position:"fixed", top:50, left:0, bottom:0, width:260, background:D.bg1, borderRight:`1px solid ${D.border}`, zIndex:300, overflowY:"auto", maxWidth:480 }}>
            {/* User info */}
            <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${D.border}`, background:D.bg2 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Avatar initials={user.avatar} color={ROLE_COL[user.role]} size={36} />
                <div>
                  <div style={{ color:D.txt, fontSize:13, fontFamily:D.sans, fontWeight:600 }}>{user.name}</div>
                  <Chip label={user.role.toUpperCase()} color={ROLE_COL[user.role]} />
                </div>
              </div>
            </div>
            {/* Menu items */}
            <div style={{ padding:"8px 0" }}>
              {menuItems.map((item)=>(
                <div key={item.id}>
                  {item.divider && <div style={{ height:1, background:D.border, margin:"6px 14px" }} />}
                  <button onClick={()=>navigate(item.id)} style={{
                    width:"100%", background:page===item.id?D.accLo:"transparent",
                    border:"none", borderLeft:`3px solid ${page===item.id?D.acc:"transparent"}`,
                    color:page===item.id?D.acc:D.txtMid, padding:"11px 16px",
                    textAlign:"left", cursor:"pointer", display:"flex", gap:12, alignItems:"center",
                    fontFamily:D.sans, fontSize:13, transition:"all 0.1s",
                  }}>
                    <span style={{ fontFamily:D.mono, fontSize:14, width:20, textAlign:"center" }}>{item.icon}</span>
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
            {/* Sign out */}
            <div style={{ padding:"8px 14px", borderTop:`1px solid ${D.border}`, marginTop:"auto" }}>
              <button onClick={()=>{ setUser(null); setMenuOpen(false); }} style={{ ...$.btn(D.red,true), padding:"9px 0" }}>Sign Out</button>
            </div>
          </div>
        </>
      )}

      {/* Page content */}
      <div style={{ padding:"16px 14px 80px" }}>
        {renderPage()}
      </div>

      {/* Bottom tab bar */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:D.bg1, borderTop:`1px solid ${D.border}`, display:"flex", zIndex:150 }}>
        {menuItems.slice(0,4).map(item=>(
          <button key={item.id} onClick={()=>navigate(item.id)} style={{
            flex:1, background:"none", border:"none", cursor:"pointer", padding:"8px 4px 10px",
            borderTop:`2px solid ${page===item.id?D.acc:"transparent"}`,
            display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          }}>
            <span style={{ color:page===item.id?D.acc:D.txtDim, fontSize:16, fontFamily:D.mono }}>{item.icon}</span>
            <span style={{ color:page===item.id?D.acc:D.txtDim, fontSize:8, fontFamily:D.mono, letterSpacing:0.5, textTransform:"uppercase" }}>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

