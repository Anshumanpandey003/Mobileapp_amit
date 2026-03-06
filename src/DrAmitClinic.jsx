import { useState, useEffect } from 'react';

// localStorage polyfill for window.storage (mobile API -> web)
if (!window.storage) {
  window.storage = {
    get: (key) => Promise.resolve(
      localStorage.getItem(key) ? { value: localStorage.getItem(key) } : null
    ),
    set: (key, value) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
  };
}

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap')`;
const STORAGE_KEY = 'clinic-patients';

const SEED_PATIENTS = [
  {
    id: 'seed-1', name: 'Priya Sharma', age: 34, gender: 'Female', phone: '98765-43210',
    blood: 'B+', lastVisit: '2 Mar 2026', type: 'General', status: 'Stable',
    symptoms: ['Fever', 'Sore Throat', 'Fatigue'],
    vitals: { bp: '118/76', pulse: 78, temp: '99.2F', spo2: 97, weight: '58 kg', height: '162 cm' },
    dental: { lastCleaning: 'Sep 2025', cavities: 1, xray: 'Normal' },
    medications: ['Paracetamol 500mg', 'Vitamin C 1000mg'],
    history: ['Seasonal Flu 2024', 'Cavity Filling 2023'],
    report: 'Patient presents with mild pharyngitis and low-grade fever. No signs of bacterial infection. Recommended rest, hydration, and OTC analgesics. Follow-up in 5 days if symptoms persist.',
    trend: [97,96,97,98,97,97,98], isNew: false
  },
  {
    id: 'seed-2', name: 'Ramesh Gupta', age: 58, gender: 'Male', phone: '87654-32109',
    blood: 'O+', lastVisit: '5 Mar 2026', type: 'Dental', status: 'Follow-up',
    symptoms: ['Tooth Pain', 'Gum Swelling'],
    vitals: { bp: '138/88', pulse: 82, temp: '98.6F', spo2: 96, weight: '74 kg', height: '170 cm' },
    dental: { lastCleaning: 'Mar 2026', cavities: 3, xray: 'Root canal advised - molar 36' },
    medications: ['Amoxicillin 500mg', 'Ibuprofen 400mg'],
    history: ['Hypertension ongoing', 'Dental extraction 2022'],
    report: 'Patient has deep caries on molar 36 with periapical abscess. Root canal treatment initiated. Antibiotic course prescribed. Second appointment scheduled for crown placement.',
    trend: [96,95,96,96,97,96,96], isNew: false
  },
  {
    id: 'seed-3', name: 'Sunita Verma', age: 27, gender: 'Female', phone: '76543-21098',
    blood: 'A+', lastVisit: '6 Mar 2026', type: 'General', status: 'Healthy',
    symptoms: ['Routine Checkup'],
    vitals: { bp: '112/72', pulse: 70, temp: '98.4F', spo2: 99, weight: '52 kg', height: '158 cm' },
    dental: { lastCleaning: 'Jan 2026', cavities: 0, xray: 'Normal' },
    medications: ['Iron supplement'],
    history: ['Anemia 2023 resolved'],
    report: 'Annual health checkup. All parameters within normal limits. Mild iron deficiency noted, supplement recommended. Dental health excellent. Next visit in 6 months.',
    trend: [99,99,98,99,99,99,99], isNew: false
  },
  {
    id: 'seed-4', name: 'Arun Mehta', age: 45, gender: 'Male', phone: '65432-10987',
    blood: 'AB+', lastVisit: '7 Mar 2026', type: 'General', status: 'Critical',
    symptoms: ['Chest Tightness', 'Shortness of Breath', 'Dizziness'],
    vitals: { bp: '158/96', pulse: 98, temp: '98.8F', spo2: 93, weight: '88 kg', height: '175 cm' },
    dental: { lastCleaning: 'Never', cavities: 5, xray: 'Pending' },
    medications: ['Amlodipine 5mg', 'Aspirin 75mg', 'Atorvastatin 20mg'],
    history: ['Hypertension 2021', 'Diabetes Type-2 2022'],
    report: 'Patient presents with hypertensive urgency and reduced SpO2. ECG ordered. Referred to cardiologist immediately. BP management medications adjusted. Strict diet and lifestyle modification advised.',
    trend: [93,92,94,93,92,93,93], isNew: false
  }
];

const statusColors = {
  Stable: { bg: '#E8F5E9', text: '#2E7D32' },
  Healthy: { bg: '#E3F2FD', text: '#1565C0' },
  'Follow-up': { bg: '#FFF8E1', text: '#F57F17' },
  Critical: { bg: '#FFEBEE', text: '#C62828' },
  New: { bg: '#F3E8FF', text: '#7E22CE' }
};
const typeColors = { General: '#0EA5E9', Dental: '#8B5CF6' };

function todayStr() {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildNewPatient(form) {
  const syms = form.symptoms ? form.symptoms.split(',').map(s => s.trim()).filter(Boolean) : ['General Complaint'];
  const spo2 = 97;
  return {
    id: 'p-' + Date.now(), name: form.name || 'Unknown', age: parseInt(form.age) || 0,
    gender: form.gender, phone: form.phone || '', blood: form.blood,
    lastVisit: todayStr(), type: form.type || 'General', status: 'New', symptoms: syms,
    vitals: { bp: '', pulse: '', temp: '', spo2, weight: form.weight ? form.weight + ' kg' : '', height: form.height ? form.height + ' cm' : '' },
    dental: { lastCleaning: 'Not recorded', cavities: 0, xray: 'Pending' },
    medications: form.medications ? form.medications.split(',').map(s => s.trim()).filter(Boolean) : [],
    history: form.history ? [form.history] : ['No prior records'],
    report: 'New patient intake on ' + todayStr() + '. Chief complaint: ' + syms.join(', ') + '. ' + (form.notes ? 'Notes: ' + form.notes : '') + ' Awaiting doctor review.',
    trend: [spo2,spo2,spo2,spo2,spo2,spo2,spo2], isNew: true
  };
}

function SparkLine({ data, color }) {
  const nums = data.map(Number);
  const max = Math.max(...nums);
  const min = Math.min(...nums) - 2;
  const w = 80, h = 28;
  const pts = nums.map((v, i) => `${(i / (nums.length - 1)) * w},${h - ((v - min) / (max - min + 1)) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <circle cx={w} cy={h - ((nums[6] - min) / (max - min + 1)) * h} r={3} fill={color} />
    </svg>
  );
}

function VitalCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '14px 16px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'Playfair Display, serif' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 22px', borderRadius: 22, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: 'nowrap', boxShadow: '0 8px 24px #0F172A50' }}>
      {msg}
    </div>
  );
}

function PatientIntakeForm({ onSubmit, onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', phone: '', blood: 'A+', type: 'General', symptoms: '', medications: '', history: '', notes: '', weight: '', height: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#1E293B', background: '#FAFCFF', outline: 'none', boxSizing: 'border-box', marginTop: 6 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.07em', fontFamily: 'DM Sans, sans-serif' };
  const steps = ['Personal', 'Health', 'Confirm'];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{FONT}</style>
      <div style={{ background: 'linear-gradient(145deg,#0F172A,#1E3A5F)', padding: '16px 20px 20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7DD3FC', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}>← Back</button>
        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, fontWeight: 700, color: '#fff' }}>New Patient</div>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Register with Dr. Amit Singh</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', height: 4, borderRadius: 4, background: step > i ? '#0EA5E9' : '#334155' }} />
              <span style={{ fontSize: 10, color: step > i ? '#7DD3FC' : '#475569', fontFamily: 'DM Sans,sans-serif' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 0' }}>
        {step === 1 && (
          <div>
            {[{ label: 'FULL NAME', key: 'name', placeholder: 'e.g. Ravi Sharma', type: 'text' }, { label: 'AGE', key: 'age', placeholder: 'e.g. 32', type: 'number' }, { label: 'PHONE NUMBER', key: 'phone', placeholder: 'e.g. 98765-43210', type: 'tel' }].map(({ label, key, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={labelStyle}>{label}</div>
                <input style={inputStyle} type={type} placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><div style={labelStyle}>GENDER</div><select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>{['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}</select></div>
              <div style={{ flex: 1 }}><div style={labelStyle}>BLOOD GROUP</div><select style={inputStyle} value={form.blood} onChange={e => set('blood', e.target.value)}>{['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b}>{b}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>VISIT TYPE</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {['General','Dental'].map(t => (
                  <button key={t} onClick={() => set('type', t)} style={{ flex: 1, padding: 12, borderRadius: 12, cursor: 'pointer', border: `2px solid ${form.type === t ? typeColors[t] : '#E2E8F0'}`, background: form.type === t ? typeColors[t] + '15' : '#fff', color: form.type === t ? typeColors[t] : '#94A3B8', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 14 }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 14 }}><div style={labelStyle}>CHIEF SYMPTOMS</div><textarea style={{ ...inputStyle, height: 76, resize: 'none' }} placeholder="e.g. Fever, Headache, Tooth Pain" value={form.symptoms} onChange={e => set('symptoms', e.target.value)} /><div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontFamily: 'DM Sans,sans-serif' }}>Separate multiple with commas</div></div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><div style={labelStyle}>WEIGHT (kg)</div><input style={inputStyle} type="number" placeholder="65" value={form.weight} onChange={e => set('weight', e.target.value)} /></div>
              <div style={{ flex: 1 }}><div style={labelStyle}>HEIGHT (cm)</div><input style={inputStyle} type="number" placeholder="170" value={form.height} onChange={e => set('height', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 14 }}><div style={labelStyle}>CURRENT MEDICATIONS</div><textarea style={{ ...inputStyle, height: 68, resize: 'none' }} placeholder="e.g. Metformin 500mg" value={form.medications} onChange={e => set('medications', e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><div style={labelStyle}>PAST MEDICAL HISTORY</div><textarea style={{ ...inputStyle, height: 68, resize: 'none' }} placeholder="e.g. Diabetes since 2020" value={form.history} onChange={e => set('history', e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><div style={labelStyle}>ADDITIONAL NOTES / ALLERGIES</div><textarea style={{ ...inputStyle, height: 60, resize: 'none' }} placeholder="Any allergies, concerns..." value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          </div>
        )}
        {step === 3 && (
          <div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: 14, marginBottom: 18 }}>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#166534', fontWeight: 700 }}>Ready to Save</div>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#15803D', marginTop: 4 }}>Your record will be saved to Dr. Singh's database immediately.</div>
            </div>
            <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', marginBottom: 14 }}>REVIEW YOUR DETAILS</div>
              {[{ label: 'Name', value: form.name }, { label: 'Age / Gender', value: `${form.age} / ${form.gender}` }, { label: 'Phone', value: form.phone }, { label: 'Blood Group', value: form.blood }, { label: 'Visit Type', value: form.type }, { label: 'Symptoms', value: form.symptoms }].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontFamily: 'DM Sans,sans-serif', fontSize: 13, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
                  <span style={{ color: '#94A3B8' }}>{row.label}</span>
                  <span style={{ color: '#0F172A', fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 20px 22px', display: 'flex', gap: 10 }}>
        {step > 1 && <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: 14, borderRadius: 14, border: '2px solid #E2E8F0', background: '#fff', color: '#64748B', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Back</button>}
        <button onClick={() => step === 3 ? onSubmit(buildNewPatient(form)) : setStep(s => s + 1)} style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: step === 3 ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{step === 3 ? 'Save to Database' : 'Continue'}</button>
      </div>
    </div>
  );
}

function Dashboard({ allPatients, onSelectPatient, onDeletePatient }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState('');
  const filtered = allPatients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || p.status === filter || p.type === filter;
    return matchSearch && matchFilter;
  });
  const newCount = allPatients.filter(p => p.isNew).length;
  const criticalCount = allPatients.filter(p => p.status === 'Critical').length;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  function handleDelete(id, e) {
    e.stopPropagation();
    onDeletePatient(id);
    setToast('Record deleted');
    setTimeout(() => setToast(''), 2500);
  }
  return (
    <div style={{ overflowY: 'auto', maxHeight: '100%', paddingBottom: 32, position: 'relative' }}>
      <style>{FONT}</style>
      {toast && <Toast msg={toast} />}
      <div style={{ background: 'linear-gradient(145deg,#0F172A,#1E3A5F)', padding: '20px 20px 26px' }}>
        <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'DM Sans,sans-serif', letterSpacing: '0.1em' }}>{today.toUpperCase()}</div>
        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 4 }}>Dr. Amit Singh</div>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#7DD3FC', marginTop: 2 }}>MDS · General Physician · Dental Surgeon</div>
        {newCount > 0 && <div style={{ marginTop: 12, background: '#7C3AED20', border: '1px solid #7C3AED50', borderRadius: 10, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#C4B5FD', fontWeight: 600 }}>🟣 {newCount} new patient{newCount !== 1 ? 's' : ''} awaiting review</span></div>}
      </div>
      <div style={{ padding: '0 14px', marginTop: -14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[{ label: 'Total', value: allPatients.length, icon: '👥', color: '#0EA5E9' }, { label: 'New', value: newCount, icon: '✨', color: '#7C3AED' }, { label: 'Critical', value: criticalCount, icon: '⚠️', color: '#EF4444' }].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 10px', boxShadow: '0 4px 20px #0F172A0D', textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'DM Sans,sans-serif' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 14px 0' }}>
        <input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {['All','New','Stable','Healthy','Follow-up','Critical','General','Dental'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 18, border: '1.5px solid', whiteSpace: 'nowrap', borderColor: filter === f ? '#0EA5E9' : '#E2E8F0', background: filter === f ? '#EFF6FF' : '#fff', color: filter === f ? '#0284C7' : '#94A3B8', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>{f}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 14px 0' }}>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 10 }}>{filtered.length} PATIENT{filtered.length !== 1 ? 'S' : ''} IN DATABASE</div>
        {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'DM Sans,sans-serif', color: '#CBD5E1', fontSize: 14 }}>No patients found</div> :
          filtered.map(p => {
            const sc = statusColors[p.status] || statusColors.Stable;
            const tc = typeColors[p.type] || '#0EA5E9';
            return (
              <div key={p.id} onClick={() => onSelectPatient(p)} style={{ background: p.isNew ? '#FEFBFF' : '#fff', border: p.isNew ? '1.5px solid #DDD6FE' : '1.5px solid #F1F5F9', borderRadius: 16, padding: '13px 14px', marginBottom: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg,${tc}20,${tc}40)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{p.type === 'Dental' ? '🦷' : '👤'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{p.name} {p.isNew && <span style={{ background: '#7C3AED', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, fontFamily: 'DM Sans,sans-serif' }}>NEW</span>}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ background: sc.bg, color: sc.text, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 18, fontFamily: 'DM Sans,sans-serif' }}>{p.status}</span>
                      <button onClick={e => handleDelete(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#CBD5E1', padding: '2px 3px' }} title="Delete">🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#64748B', marginTop: 2 }}>{p.age} yrs · {p.gender} · {p.blood} · {p.lastVisit}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.symptoms.slice(0, 2).map(s => <span key={s} style={{ background: '#F1F5F9', color: '#475569', fontSize: 10, padding: '2px 7px', borderRadius: 8, fontFamily: 'DM Sans,sans-serif' }}>{s}</span>)}
                      {p.symptoms.length > 2 && <span style={{ background: '#F1F5F9', color: '#94A3B8', fontSize: 10, padding: '2px 7px', borderRadius: 8 }}>+{p.symptoms.length - 2}</span>}
                    </div>
                    <SparkLine data={p.trend} color={p.status === 'Critical' ? '#EF4444' : p.isNew ? '#7C3AED' : '#0EA5E9'} />
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>

function PatientDetail({ patient, onBack, onMarkSeen }) {
  const [tab, setTab] = useState('overview');
  const sc = statusColors[patient.status] || statusColors.Stable;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{FONT}</style>
      <div style={{ background: 'linear-gradient(145deg,#0F172A,#1E3A5F)', padding: '16px 20px 20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7DD3FC', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: 'linear-gradient(135deg,#0EA5E9,#0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{patient.gender === 'Female' ? '👩' : '👨'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 19, fontWeight: 700, color: '#fff' }}>{patient.name} {patient.isNew && <span style={{ background: '#7C3AED', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, fontFamily: 'DM Sans,sans-serif' }}>NEW</span>}</div>
            <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{patient.age} yrs · {patient.gender} · {patient.blood} · {patient.phone}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ background: sc.bg, color: sc.text, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: 'DM Sans,sans-serif' }}>{patient.status}</span>
              <span style={{ background: '#ffffff15', color: '#CBD5E1', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontFamily: 'DM Sans,sans-serif' }}>{patient.type}</span>
            </div>
          </div>
        </div>
        {patient.isNew && <button onClick={onMarkSeen} style={{ marginTop: 10, width: '100%', padding: 9, borderRadius: 10, border: '1px solid #7C3AED80', background: '#7C3AED20', color: '#C4B5FD', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Mark as Reviewed → Change to Stable</button>}
      </div>
      <div style={{ display: 'flex', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        {[{ id: 'overview', label: 'Overview' }, { id: 'vitals', label: 'Vitals' }, { id: 'dental', label: 'Dental' }, { id: 'report', label: 'Report' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '11px 0', border: 'none', background: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, color: tab === t.id ? '#0EA5E9' : '#94A3B8', borderBottom: tab === t.id ? '2px solid #0EA5E9' : '2px solid transparent', cursor: 'pointer' }}>{t.label.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'overview' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 8 }}>SYMPTOMS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{patient.symptoms.map(s => <span key={s} style={{ background: '#FEF3C7', color: '#92400E', fontFamily: 'DM Sans,sans-serif', fontSize: 13, padding: '5px 14px', borderRadius: 18 }}>{s}</span>)}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 8 }}>MEDICATIONS</div>
              {patient.medications.length > 0 ? patient.medications.map((m, i) => <div key={i} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 11, padding: '9px 13px', marginBottom: 7, fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#15803D' }}>{m}</div>) : <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#CBD5E1' }}>No medications recorded</div>}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 8 }}>MEDICAL HISTORY</div>
              {patient.history.map((h, i) => <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 11, padding: '9px 13px', marginBottom: 7, fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#475569' }}>{h}</div>)}
            </div>
          </div>
        )}
        {tab === 'vitals' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}><VitalCard label="Blood Pressure" value={patient.vitals.bp} icon="❤️" color="#EF4444" sub="mmHg" /><VitalCard label="SpO₂" value={patient.vitals.spo2 + '%'} icon="💧" color="#0EA5E9" /></div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}><VitalCard label="Pulse" value={typeof patient.vitals.pulse === 'number' ? patient.vitals.pulse + ' bpm' : patient.vitals.pulse} icon="💓" color="#F59E0B" /><VitalCard label="Temperature" value={patient.vitals.temp} icon="🌡️" color="#8B5CF6" /></div>
            <div style={{ display: 'flex', gap: 10 }}><VitalCard label="Weight" value={patient.vitals.weight} icon="⚖️" color="#10B981" /><VitalCard label="Height" value={patient.vitals.height} icon="📏" color="#64748B" /></div>
            <div style={{ marginTop: 16, background: '#F8FAFC', borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 10 }}>SpO₂ TREND (7 DAYS)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
                {patient.trend.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 9, color: '#94A3B8' }}>{v}</div>
                    <div style={{ width: '100%', borderRadius: 5, background: v >= 97 ? '#0EA5E9' : v >= 95 ? '#F59E0B' : '#EF4444', height: (v - 90) / 10 * 40 + 8 }} />
                    <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 9, color: '#CBD5E1' }}>D{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === 'dental' && (
          <div>
            {[{ label: 'Last Cleaning', value: patient.dental.lastCleaning, icon: '🪷', color: '#7C3AED' }, { label: 'Active Cavities', value: patient.dental.cavities + ' detected', icon: '🦷', color: patient.dental.cavities > 0 ? '#EF4444' : '#10B981' }, { label: 'X-Ray Report', value: patient.dental.xray, icon: '📷', color: '#0F172A' }].map(item => (
              <div key={item.label} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', marginBottom: 9, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 20 }}>{item.icon}</div>
                <div><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>{item.label.toUpperCase()}</div><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: item.color, fontWeight: 600, marginTop: 2 }}>{item.value}</div></div>
              </div>
            ))}
          </div>
        )}
        {tab === 'report' && (
          <div>
            <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Medical Report</div>
                <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 10, padding: '3px 10px', borderRadius: 18, fontFamily: 'DM Sans,sans-serif', fontWeight: 600 }}>{patient.lastVisit}</span>
              </div>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#475569', lineHeight: 1.7 }}>{patient.report}</div>
            </div>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>CONSULTING DOCTOR</div>
              <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>Dr. Amit Singh</div>
              <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#3B82F6', marginTop: 2 }}>MDS · General Physician · Dental Surgeon</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessScreen({ patientName, onGoBack }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
      <style>{FONT}</style>
      <div style={{ fontSize: 60, marginBottom: 12 }}>✅</div>
      <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 23, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Saved to Database!</div>
      <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 10 }}><strong>{patientName}</strong>'s record is now in Dr. Singh's system.</div>
      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '10px 18px', marginBottom: 20, fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#6D28D9' }}>This record persists across all future sessions</div>
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '12px 18px', marginBottom: 24, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#15803D' }}>Clinic Hours: Mon–Sat 9 AM – 7 PM</div>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#15803D', marginTop: 4 }}>Emergency: +91 98765-00000</div>
      </div>
      <button onClick={onGoBack} style={{ padding: '14px 36px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Back to Home</button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [allPatients, setAllPatients] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        const saved = result ? JSON.parse(result.value) : [];
        const savedIds = new Set(saved.map(p => p.id));
        const merged = [...saved, ...SEED_PATIENTS.filter(p => !savedIds.has(p.id))];
        setAllPatients(merged);
      } catch {
        setAllPatients([...SEED_PATIENTS]);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (allPatients === null) return;
    window.storage.set(STORAGE_KEY, JSON.stringify(allPatients)).catch(() => {});
  }, [allPatients]);

  function handleSubmit(newPatient) {
    setLastAdded(newPatient);
    setAllPatients(prev => [newPatient, ...prev]);
    setScreen('success');
  }
  function handleDelete(id) {
    setAllPatients(prev => prev.filter(p => p.id !== id));
  }
  function handleMarkSeen(patientId) {
    setAllPatients(prev => prev.map(p => p.id === patientId ? { ...p, isNew: false, status: p.status === 'New' ? 'Stable' : p.status } : p));
  }

  const isDark = screen === 'home' || screen === 'patient';

  function renderScreen() {
    if (allPatients === null) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}><div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#64748B' }}>Loading records…</div></div>;
    if (screen === 'patient' && selectedPatient) {
      const live = allPatients.find(p => p.id === selectedPatient.id) || selectedPatient;
      return <PatientDetail patient={live} onBack={() => setScreen('doctor')} onMarkSeen={() => handleMarkSeen(live.id)} />;
    }
    if (screen === 'doctor') return <Dashboard allPatients={allPatients} onSelectPatient={p => { setSelectedPatient(p); setScreen('patient'); }} onDeletePatient={handleDelete} />;
    if (screen === 'intake') return <PatientIntakeForm onSubmit={handleSubmit} onBack={() => setScreen('home')} />;
    if (screen === 'success') return <SuccessScreen patientName={lastAdded?.name || 'Patient'} onGoBack={() => setScreen('home')} />;
    return (
      <div style={{ background: 'linear-gradient(160deg,#0F172A 0%,#1E3A5F 60%,#0EA5E920 100%)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative', overflow: 'hidden' }}>
        <style>{FONT}</style>
        <div style={{ fontSize: 58, marginBottom: 12 }}>🏥</div>
        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 28, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: 6 }}>Dr. Amit Singh</div>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#7DD3FC', textAlign: 'center', marginBottom: 4 }}>MDS · General Physician · Dental Surgeon</div>
        <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#475569', textAlign: 'center', marginBottom: 8 }}>Your trusted family clinic</div>
        <div style={{ background: '#ffffff0A', border: '1px solid #ffffff10', borderRadius: 12, padding: '8px 18px', marginBottom: 34, fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
          {allPatients?.length ?? '...'} patient record{allPatients?.length !== 1 ? 's' : ''} stored
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setScreen('intake')} style={{ width: '100%', padding: 17, borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 28px #0EA5E940' }}>I'm a Patient — Register Visit</button>
          <button onClick={() => setScreen('doctor')} style={{ width: '100%', padding: 17, borderRadius: 16, border: '2px solid #334155', background: 'transparent', color: '#E2E8F0', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Doctor Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#E0F2FE 0%,#F0F9FF 50%,#EDE9FE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{FONT}</style>
      <div style={{ width: 390, height: 780, background: '#F8FAFC', borderRadius: 44, overflow: 'hidden', boxShadow: '0 40px 100px #0F172A30, 0 0 0 1px #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: isDark ? '#0F172A' : '#F8FAFC', padding: '10px 24px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#ffffff99' : '#0F172A99' }}>9:41</span>
          <span style={{ fontSize: 12, color: isDark ? '#ffffff55' : '#0F172A55' }}>📣</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
  );
}
