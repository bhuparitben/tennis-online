import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'

const inp = 'w-full rounded-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-lg bg-primary-light text-primary flex items-center justify-center text-xs font-bold">{n}</span>
        <h3 className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

const REC_TYPES = [
  { icon: '👤', label: 'บุคคล' },
  { icon: '🏢', label: 'คลับ' },
  { icon: '👤', label: 'โค้ช' },
  { icon: '🎓', label: 'Academy' },
  { icon: '🏆', label: 'ผู้จัดการแข่งขัน' },
  { icon: '👥', label: 'ชุมชนเทนนิส' },
]

export default function RecommendPage() {
  const [recType, setRecType] = useState('บุคคล')
  const [permission, setPermission] = useState('yes')

  return (
    <AppLayout>
      <TopBar
        title="แนะนำบุคคล / คลับ / เครือข่าย"
        breadcrumbs={[{ label: 'หน้าหลัก', to: '/ambassador/dashboard' }, { label: 'แนะนำบุคคล/คลับ' }]}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block bg-gray-100 text-muted text-xs px-2 py-0.5 rounded-full font-semibold">Mockup</span>
          <p className="text-xs text-muted">ฟอร์มนี้เป็น mockup — ยังไม่เชื่อมต่อ API</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left form */}
          <div className="lg:col-span-2 space-y-4">
            <Section n={1} title="ประเภทที่แนะนำ">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {REC_TYPES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setRecType(t.label)}
                    className={[
                      'flex flex-col items-center gap-1 p-3 rounded-xl border text-center text-sm font-semibold transition-all',
                      recType === t.label
                        ? 'border-primary bg-primary-light text-primary shadow-sm'
                        : 'border-border bg-white text-muted hover:border-primary/30',
                    ].join(' ')}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section n={2} title="ข้อมูลแนะนำ">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">ชื่อบุคคล / คลับ / องค์กร <span className="text-danger">*</span></label>
                  <input className={inp} placeholder="กรอกชื่อ-นามสกุล หรือชื่อคลับ/องค์กร" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">บทบาท / ตำแหน่ง</label>
                  <input className={inp} placeholder="เช่น ผู้จัดการคลับ, โค้ช, ผู้ประสานงาน" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">จังหวัด / พื้นที่ <span className="text-danger">*</span></label>
                  <select className={inp}><option>เลือกจังหวัด</option></select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">สนามหรือองค์กรที่เกี่ยวข้อง</label>
                  <input className={inp} placeholder="เช่น Victory Tennis Club, สมาคมฯ" />
                </div>
              </div>
            </Section>

            <Section n={3} title="ช่องทางติดต่อ">
              <div className="grid grid-cols-3 gap-3">
                <input className={inp} placeholder="📞 เบอร์โทรศัพท์" />
                <input className={inp} placeholder="🟢 Line ID" />
                <input className={inp} placeholder="📘 Facebook" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input className={inp} placeholder="📷 Instagram" />
                <input className={inp} placeholder="🌐 Website" />
                <input className={inp} placeholder="✉️ อีเมล" />
              </div>
            </Section>

            <Section n={4} title="เหตุผลในการแนะนำ">
              <textarea
                className={inp + ' resize-none'}
                rows={3}
                placeholder="อธิบายเหตุผลที่แนะนำบุคคล/คลับนี้ จุดเด่น สิ่งที่น่าร่วมงาน หรือคุณค่าที่มีต่อวงการเทนนิส"
              />
            </Section>

            <Section n={5} title="ความเกี่ยวข้องและการยินยอม">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">คุณรู้จักผ่านทางใด <span className="text-danger">*</span></label>
                  <select className={inp}>
                    <option>เลือกความสัมพันธ์</option>
                    <option>เพื่อนร่วมสนาม</option>
                    <option>โค้ชของฉัน</option>
                    <option>เจ้าของสนาม</option>
                    <option>ผู้จัดการแข่งขัน</option>
                    <option>อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">ได้รับอนุญาตให้แนะนำ <span className="text-danger">*</span></label>
                  <div className="flex gap-4">
                    {[{ v: 'yes', label: 'ได้แล้ว' }, { v: 'no', label: 'ยังไม่ได้' }].map((opt) => (
                      <label key={opt.v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="rperm" checked={permission === opt.v} onChange={() => setPermission(opt.v)} className="accent-primary" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">หมายเหตุเพิ่มเติม</label>
                  <input className={inp} placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)" />
                </div>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary/30 transition-colors">🖹 บันทึกร่าง</button>
              <button type="button" className="flex-1 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity text-center">➤ ส่งให้ทีม TOT</button>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-semibold text-primary text-sm mb-3">เหมาะสำหรับการเชื่อมเครือข่าย</h4>
              <ul className="space-y-3">
                {[
                  { icon: '🛡', color: 'text-success', title: 'แนะนำข้อมูลที่เชื่อถือได้', desc: 'กรอกข้อมูลให้ครบถ้วนและถูกต้อง' },
                  { icon: '🤝', color: 'text-warning', title: 'ไม่รับปากแทน TOT', desc: 'การแนะนำเป็นเพียงการเชื่อมต่อ ทีม TOT จะติดต่อโดยตรงอีกครั้ง' },
                  { icon: '👤', color: 'text-primary', title: 'ระบุความสัมพันธ์ให้ชัดเจน', desc: 'ช่วยให้เข้าใจบริบทและความน่าเชื่อถือ' },
                  { icon: '🔒', color: 'text-success', title: 'ข้อมูลของคุณปลอดภัย', desc: '' },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-2.5">
                    <span className={`shrink-0 ${item.color}`}>{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-ink">{item.title}</p>
                      {item.desc && <p className="text-xs text-muted mt-0.5">{item.desc}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-semibold text-ink text-sm mb-3">❓ ต้องการความช่วยเหลือ?</h4>
              <div className="text-xs text-muted space-y-1">
                <p>📧 fa-support@tottennis.or.th</p>
                <p>📞 02-123-4567</p>
                <p>🕘 จันทร์ – ศุกร์ 09:00 – 17:00 น.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
