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

const CATEGORIES = [
  { icon: '👥', label: 'ชุมชนเทนนิส' },
  { icon: '🏟', label: 'สนาม' },
  { icon: '🏅', label: 'นักกีฬา' },
  { icon: '👤', label: 'โค้ช' },
  { icon: '📅', label: 'กิจกรรม' },
  { icon: '❤️', label: 'แรงบันดาลใจ' },
]

const TAGS = ['เยาวชน', 'คลินิกเทนนิส', 'ชุมชนเทนนิส']

const PUBLISH_STATUS = [
  { value: 'ready', label: '✓ พร้อมเผยแพร่' },
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'draft', label: 'ร่าง' },
]

export default function SubmitStoryPage() {
  const [selectedCat, setSelectedCat] = useState('ชุมชนเทนนิส')
  const [publishStatus, setPublishStatus] = useState('ready')
  const [permission, setPermission] = useState('yes')

  return (
    <AppLayout>
      <TopBar
        title="ส่งเรื่องราว / ภาพ"
        breadcrumbs={[{ label: 'หน้าหลัก', to: '/ambassador/dashboard' }, { label: 'ส่งเรื่องราว' }]}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block bg-gray-100 text-muted text-xs px-2 py-0.5 rounded-full font-semibold">Mockup</span>
          <p className="text-xs text-muted">ฟอร์มนี้เป็น mockup — ยังไม่เชื่อมต่อ API</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left form */}
          <div className="lg:col-span-2 space-y-4">
            <Section n={1} title="ข้อมูลเรื่องราว">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">หัวข้อเรื่อง <span className="text-danger">*</span></label>
                <input className={inp} placeholder="พิมพ์หัวข้อเรื่องของคุณ" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-2">หมวดหมู่ <span className="text-danger">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setSelectedCat(c.label)}
                      className={[
                        'px-3 py-1.5 rounded-xl border text-sm font-medium transition-all',
                        selectedCat === c.label
                          ? 'border-primary bg-primary-light text-primary shadow-sm'
                          : 'border-border bg-white text-muted hover:border-primary/30',
                      ].join(' ')}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">จังหวัด / พื้นที่ <span className="text-danger">*</span></label>
                  <select className={inp}><option>เลือกจังหวัด</option></select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">สนามหรือสถานที่เกี่ยวข้อง</label>
                  <input className={inp} placeholder="ค้นหาหรือระบุชื่อสนาม (ถ้ามี)" />
                </div>
              </div>
            </Section>

            <Section n={2} title="เนื้อหา">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">บทสรุปสั้น <span className="text-danger">*</span></label>
                  <textarea className={inp} rows={5} placeholder="สรุปเรื่องราวของคุณใน 1-2 ประโยค (สำหรับแสดงในหน้ารายการ)" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">รายละเอียดเรื่องราว <span className="text-danger">*</span></label>
                  <div className="rounded-t-xl border border-border border-b-0 px-3 py-1.5 bg-bg text-xs text-muted">
                    Paragraph · <strong>B</strong> <em>I</em> <u>U</u> · ≣ · 🔗 🖼
                  </div>
                  <textarea className="w-full rounded-b-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors resize-none" rows={4} placeholder="เล่าเรื่องราวของคุณให้ละเอียด…" />
                </div>
              </div>
            </Section>

            <Section n={3} title="สื่อประกอบ">
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-muted hover:border-primary/40 transition-colors cursor-pointer">
                <span className="text-2xl">☁️</span>
                <p className="text-sm mt-1">ลากและวางรูปภาพที่นี่ หรือ{' '}
                  <button type="button" className="border border-border rounded-lg px-3 py-1 text-xs text-ink hover:border-primary/40 ml-1">เลือกไฟล์</button>
                </p>
                <p className="text-xs mt-1">JPG, PNG, WebP (สูงสุด 10 ไฟล์)</p>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-video rounded-xl" style={{ background: 'linear-gradient(135deg,#2E7D57,#3DA06E)' }} />
                ))}
              </div>
            </Section>

            <Section n={4} title="แหล่งที่มาและสิทธิ์การใช้งาน">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">ชื่อผู้ถ่าย / เจ้าของเนื้อหา <span className="text-danger">*</span></label>
                  <input className={inp} placeholder="เช่น ศิริลักษณ์ วงษ์ดี" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">ได้รับอนุญาตหรือไม่ <span className="text-danger">*</span></label>
                  <div className="flex gap-4">
                    {[{ v: 'yes', label: 'ได้รับอนุญาตแล้ว' }, { v: 'no', label: 'ยังไม่ได้รับอนุญาต' }].map((opt) => (
                      <label key={opt.v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="perm" checked={permission === opt.v} onChange={() => setPermission(opt.v)} className="accent-primary" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className={inp} placeholder="แหล่งที่มา (ถ้ามี)" />
                <input className={inp} placeholder="เครดิตที่ต้องการให้แสดง" />
              </div>
            </Section>

            <Section n={5} title="คำแนะนำการเผยแพร่">
              <div>
                <label className="block text-xs font-semibold text-ink mb-2">แท็ก</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-primary-light text-primary rounded-lg px-2.5 py-1 text-xs font-medium">
                      {t} <span className="cursor-pointer hover:text-danger">✕</span>
                    </span>
                  ))}
                  <input className="rounded-lg border border-dashed border-border px-2 py-1 text-xs placeholder-muted focus:outline-none focus:border-primary" placeholder="+ เพิ่มแท็ก" style={{ width: 90 }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-2">สถานะการเผยแพร่</label>
                <div className="flex flex-wrap gap-2">
                  {PUBLISH_STATUS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setPublishStatus(s.value)}
                      className={[
                        'px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                        publishStatus === s.value
                          ? 'border-success bg-success-light text-success shadow-sm'
                          : 'border-border bg-white text-muted hover:border-primary/30',
                      ].join(' ')}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary/30 transition-colors">🖹 บันทึกร่าง</button>
              <button type="button" className="rounded-xl border border-primary bg-white text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary-light transition-colors">👁 ดูตัวอย่างบทความ</button>
              <button type="button" className="flex-1 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity text-center">➤ ส่งให้ทีมตรวจสอบ</button>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-semibold text-ink text-sm mb-3">💡 แนวทางเนื้อหาที่ดี</h4>
              <ul className="space-y-2">
                {['เล่าเรื่องจริงจากประสบการณ์ของคุณ', 'ใช้ภาษาสุภาพ และเข้าใจง่าย', 'ระบุแหล่งที่มาและสื่อประกอบ', 'เคารพลิขสิทธิ์ ขออนุญาตก่อนเผยแพร่'].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-xs">
                    <span className="text-success shrink-0">✓</span>
                    <span className="text-ink">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5">
              <h4 className="font-semibold text-ink text-sm mb-3">ตัวอย่างการแสดงผลเมื่อเผยแพร่</h4>
              <div className="aspect-video rounded-xl mb-3" style={{ background: 'linear-gradient(135deg,#2E7D57,#3DA06E)' }} />
              <p className="text-sm font-semibold text-ink">กิจกรรมคลินิกเทนนิสเยาวชน สร้างฝัน สู่การแข่งขัน</p>
              <p className="text-xs text-muted mt-1">📍 กรุงเทพมหานคร · Victory Tennis Club</p>
              <div className="flex gap-3 mt-2 text-xs text-muted">
                <span>❤️ 128</span>
                <span>💬 12</span>
                <span>↗ 8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
