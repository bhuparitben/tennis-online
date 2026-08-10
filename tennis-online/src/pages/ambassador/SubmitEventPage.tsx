import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'

const inp = 'w-full rounded-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors'
const label = (text: string, req = false) => (
  <label className="block text-xs font-semibold text-ink mb-1">
    {text}{req && <span className="text-danger ml-0.5">*</span>}
  </label>
)

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-lg bg-primary-light text-primary flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{n}</span>
        <h3 className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function SubmitEventPage() {
  const [eventType, setEventType] = useState('การแข่งขัน')

  return (
    <AppLayout>
      <TopBar
        title="ส่งการแข่งขัน / กิจกรรม"
        breadcrumbs={[
          { label: 'หน้าหลัก', to: '/ambassador/dashboard' },
          { label: 'ส่งการแข่งขัน' },
        ]}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block bg-gray-100 text-muted text-xs px-2 py-0.5 rounded-full font-semibold">Mockup</span>
          <p className="text-xs text-muted">ฟอร์มนี้เป็น mockup — ยังไม่เชื่อมต่อ API</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left form */}
          <div className="lg:col-span-2 space-y-4">
            <Section n={1} title="รายละเอียดกิจกรรม">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {label('ชื่องาน', true)}
                  <input className={inp} placeholder="ระบุชื่องาน / กิจกรรม" />
                </div>
                <div>
                  {label('ประเภทกิจกรรม', true)}
                  <div className="flex flex-wrap gap-3 mt-1">
                    {['การแข่งขัน', 'Clinic', 'Community', 'Junior'].map((t) => (
                      <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="etype" checked={eventType === t} onChange={() => setEventType(t)} className="accent-primary" />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {label('คำอธิบายสั้นๆ', true)}
              <textarea className={inp} rows={2} placeholder="อธิบายวัตถุประสงค์ รายละเอียดโดยย่อ และจุดเด่นของกิจกรรม" />
            </Section>

            <Section n={2} title="วันเวลาและสถานที่">
              <div className="grid grid-cols-3 gap-3">
                <div>{label('วันที่จัด', true)}<input className={inp} placeholder="วว/ดด/ปปปป" /></div>
                <div>{label('เวลาเริ่ม', true)}<input className={inp} type="time" defaultValue="09:00" /></div>
                <div>{label('เวลาสิ้นสุด', true)}<input className={inp} type="time" defaultValue="17:00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>{label('สถานที่', true)}<input className={inp} placeholder="ระบุชื่อสนาม / สถานที่จัด" /></div>
                <div>{label('จังหวัด', true)}<select className={inp}><option>เลือกจังหวัด</option></select></div>
              </div>
              {label('Google Map Link')}
              <input className={inp} placeholder="วางลิงก์ Google Maps ของสถานที่จัดกิจกรรม" />
            </Section>

            <Section n={3} title="การสมัคร">
              <div className="grid grid-cols-3 gap-3">
                <div>{label('ค่าสมัคร (บาท)')}<input className={inp} placeholder="฿ ระบุจำนวนเงิน" /></div>
                <div>{label('วันปิดรับสมัคร', true)}<input className={inp} placeholder="วว/ดด/ปปปป" /></div>
                <div>{label('กลุ่มผู้เข้าร่วม', true)}<select className={inp}><option>เลือกกลุ่ม</option><option>ทั่วไป</option><option>เยาวชน</option><option>อาชีพ</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>{label('ช่องทางสมัคร', true)}<select className={inp}><option>เลือกช่องทาง</option><option>LINE</option><option>Facebook</option><option>เว็บไซต์</option></select></div>
                <div>{label('ลิงก์สมัคร')}<input className={inp} placeholder="https://…" /></div>
              </div>
            </Section>

            <Section n={4} title="ผู้จัดและการติดต่อ">
              <div className="grid grid-cols-2 gap-3">
                <div>{label('ชื่อผู้จัด', true)}<input className={inp} placeholder="ระบุชื่อผู้จัด / องค์กร" /></div>
                <div>{label('เบอร์โทรศัพท์', true)}<input className={inp} placeholder="08X-XXX-XXXX" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input className={inp} placeholder="Line ID" />
                <input className={inp} placeholder="Facebook Page" />
                <input className={inp} placeholder="Website" />
              </div>
            </Section>

            <Section n={5} title="สื่อประกอบ">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🖼', label: 'อัปโหลดโปสเตอร์', req: true },
                  { icon: '🖼', label: 'รูปภาพเพิ่มเติม', req: false },
                  { icon: '📄', label: 'เอกสารประกาศ', req: false },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-dashed border-border p-4 text-center text-muted hover:border-primary/40 transition-colors cursor-pointer">
                    <span className="text-2xl block mb-1">{item.icon}</span>
                    <p className="text-xs">{item.label}{item.req && <span className="text-danger">*</span>}</p>
                    <button type="button" className="mt-2 rounded-lg border border-border bg-white px-3 py-1 text-xs text-ink hover:border-primary/40">เลือกไฟล์</button>
                  </div>
                ))}
              </div>
            </Section>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary/30 transition-colors">🖹 บันทึกร่าง</button>
              <button type="button" className="rounded-xl border border-primary bg-white text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary-light transition-colors">📎 แนบไฟล์เพิ่ม</button>
              <button type="button" className="flex-1 rounded-xl bg-success text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity text-center">➤ ส่งข้อมูล</button>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-semibold text-ink text-sm mb-3">ℹ️ ข้อมูลที่ควรมี</h4>
              <ul className="space-y-2">
                {['ชื่องาน · วันที่ · เวลา · สถานที่', 'ประเภทกิจกรรม · กลุ่มผู้เข้าร่วม', 'ค่าสมัคร · วันปิดรับ · ช่องทางสมัคร', 'ชื่อและช่องทางติดต่อผู้จัด'].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-xs">
                    <span className="text-success shrink-0 mt-0.5">✓</span>
                    <span className="text-ink">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Poster preview */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-semibold text-ink text-sm mb-3">ตัวอย่างโปสเตอร์</h4>
              <div className="rounded-xl p-4 text-center text-white" style={{ background: 'linear-gradient(135deg,#12327A,#1657C8)' }}>
                <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>TOT JUNIOR TENNIS</p>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#D7F04B' }}>CHAMPIONSHIP 2025</p>
                <p className="text-xs opacity-70 mt-1">25–26 พ.ค. 2567 @ Victory Tennis Club</p>
                <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center mx-auto mt-3 text-xs font-bold" style={{ background: '#D7F04B', color: '#12327A' }}>
                  <span>ค่าสมัคร</span>
                  <span>800฿</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
