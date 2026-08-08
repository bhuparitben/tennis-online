import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ===== Data =====

const surfaceTypes = ['Hard', 'Clay', 'Carpet', 'Artificial Grass', 'Grass'];

const provinces = [
  // ภาคเหนือ
  { name_th: 'เชียงใหม่', name_en: 'Chiang Mai', region: 'ภาคเหนือ' },
  { name_th: 'เชียงราย', name_en: 'Chiang Rai', region: 'ภาคเหนือ' },
  { name_th: 'น่าน', name_en: 'Nan', region: 'ภาคเหนือ' },
  { name_th: 'พะเยา', name_en: 'Phayao', region: 'ภาคเหนือ' },
  { name_th: 'แพร่', name_en: 'Phrae', region: 'ภาคเหนือ' },
  { name_th: 'แม่ฮ่องสอน', name_en: 'Mae Hong Son', region: 'ภาคเหนือ' },
  { name_th: 'ลำปาง', name_en: 'Lampang', region: 'ภาคเหนือ' },
  { name_th: 'ลำพูน', name_en: 'Lamphun', region: 'ภาคเหนือ' },
  { name_th: 'อุตรดิตถ์', name_en: 'Uttaradit', region: 'ภาคเหนือ' },
  // ภาคกลาง
  { name_th: 'กรุงเทพมหานคร', name_en: 'Bangkok', region: 'ภาคกลาง' },
  { name_th: 'กำแพงเพชร', name_en: 'Kamphaeng Phet', region: 'ภาคกลาง' },
  { name_th: 'ชัยนาท', name_en: 'Chai Nat', region: 'ภาคกลาง' },
  { name_th: 'นครนายก', name_en: 'Nakhon Nayok', region: 'ภาคกลาง' },
  { name_th: 'นครปฐม', name_en: 'Nakhon Pathom', region: 'ภาคกลาง' },
  { name_th: 'นครสวรรค์', name_en: 'Nakhon Sawan', region: 'ภาคกลาง' },
  { name_th: 'นนทบุรี', name_en: 'Nonthaburi', region: 'ภาคกลาง' },
  { name_th: 'ปทุมธานี', name_en: 'Pathum Thani', region: 'ภาคกลาง' },
  { name_th: 'พระนครศรีอยุธยา', name_en: 'Phra Nakhon Si Ayutthaya', region: 'ภาคกลาง' },
  { name_th: 'พิจิตร', name_en: 'Phichit', region: 'ภาคกลาง' },
  { name_th: 'พิษณุโลก', name_en: 'Phitsanulok', region: 'ภาคกลาง' },
  { name_th: 'เพชรบูรณ์', name_en: 'Phetchabun', region: 'ภาคกลาง' },
  { name_th: 'ลพบุรี', name_en: 'Lop Buri', region: 'ภาคกลาง' },
  { name_th: 'สระบุรี', name_en: 'Saraburi', region: 'ภาคกลาง' },
  { name_th: 'สิงห์บุรี', name_en: 'Sing Buri', region: 'ภาคกลาง' },
  { name_th: 'สุโขทัย', name_en: 'Sukhothai', region: 'ภาคกลาง' },
  { name_th: 'สุพรรณบุรี', name_en: 'Suphan Buri', region: 'ภาคกลาง' },
  { name_th: 'อ่างทอง', name_en: 'Ang Thong', region: 'ภาคกลาง' },
  { name_th: 'อุทัยธานี', name_en: 'Uthai Thani', region: 'ภาคกลาง' },
  // ภาคตะวันออก
  { name_th: 'จันทบุรี', name_en: 'Chanthaburi', region: 'ภาคตะวันออก' },
  { name_th: 'ฉะเชิงเทรา', name_en: 'Chachoengsao', region: 'ภาคตะวันออก' },
  { name_th: 'ชลบุรี', name_en: 'Chon Buri', region: 'ภาคตะวันออก' },
  { name_th: 'ตราด', name_en: 'Trat', region: 'ภาคตะวันออก' },
  { name_th: 'ปราจีนบุรี', name_en: 'Prachin Buri', region: 'ภาคตะวันออก' },
  { name_th: 'ระยอง', name_en: 'Rayong', region: 'ภาคตะวันออก' },
  { name_th: 'สมุทรปราการ', name_en: 'Samut Prakan', region: 'ภาคตะวันออก' },
  { name_th: 'สระแก้ว', name_en: 'Sa Kaeo', region: 'ภาคตะวันออก' },
  // ภาคตะวันตก
  { name_th: 'กาญจนบุรี', name_en: 'Kanchanaburi', region: 'ภาคตะวันตก' },
  { name_th: 'ตาก', name_en: 'Tak', region: 'ภาคตะวันตก' },
  { name_th: 'ประจวบคีรีขันธ์', name_en: 'Prachuap Khiri Khan', region: 'ภาคตะวันตก' },
  { name_th: 'เพชรบุรี', name_en: 'Phetchaburi', region: 'ภาคตะวันตก' },
  { name_th: 'ราชบุรี', name_en: 'Ratchaburi', region: 'ภาคตะวันตก' },
  { name_th: 'สมุทรสงคราม', name_en: 'Samut Songkhram', region: 'ภาคตะวันตก' },
  { name_th: 'สมุทรสาคร', name_en: 'Samut Sakhon', region: 'ภาคตะวันตก' },
  // ภาคตะวันออกเฉียงเหนือ
  { name_th: 'กาฬสินธุ์', name_en: 'Kalasin', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'ขอนแก่น', name_en: 'Khon Kaen', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'ชัยภูมิ', name_en: 'Chaiyaphum', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'นครพนม', name_en: 'Nakhon Phanom', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'นครราชสีมา', name_en: 'Nakhon Ratchasima', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'บึงกาฬ', name_en: 'Bueng Kan', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'บุรีรัมย์', name_en: 'Buri Ram', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'มหาสารคาม', name_en: 'Maha Sarakham', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'มุกดาหาร', name_en: 'Mukdahan', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'ยโสธร', name_en: 'Yasothon', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'ร้อยเอ็ด', name_en: 'Roi Et', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'เลย', name_en: 'Loei', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'ศรีสะเกษ', name_en: 'Si Sa Ket', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'สกลนคร', name_en: 'Sakon Nakhon', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'สุรินทร์', name_en: 'Surin', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'หนองคาย', name_en: 'Nong Khai', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'หนองบัวลำภู', name_en: 'Nong Bua Lam Phu', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'อำนาจเจริญ', name_en: 'Amnat Charoen', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'อุดรธานี', name_en: 'Udon Thani', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { name_th: 'อุบลราชธานี', name_en: 'Ubon Ratchathani', region: 'ภาคตะวันออกเฉียงเหนือ' },
  // ภาคใต้
  { name_th: 'กระบี่', name_en: 'Krabi', region: 'ภาคใต้' },
  { name_th: 'ชุมพร', name_en: 'Chumphon', region: 'ภาคใต้' },
  { name_th: 'ตรัง', name_en: 'Trang', region: 'ภาคใต้' },
  { name_th: 'นครศรีธรรมราช', name_en: 'Nakhon Si Thammarat', region: 'ภาคใต้' },
  { name_th: 'นราธิวาส', name_en: 'Narathiwat', region: 'ภาคใต้' },
  { name_th: 'ปัตตานี', name_en: 'Pattani', region: 'ภาคใต้' },
  { name_th: 'พระทานคีรี', name_en: 'Phatthalung', region: 'ภาคใต้' },
  { name_th: 'พัทลุง', name_en: 'Phatthalung', region: 'ภาคใต้' },
  { name_th: 'พังงา', name_en: 'Phang Nga', region: 'ภาคใต้' },
  { name_th: 'ภูเก็ต', name_en: 'Phuket', region: 'ภาคใต้' },
  { name_th: 'ยะลา', name_en: 'Yala', region: 'ภาคใต้' },
  { name_th: 'ระนอง', name_en: 'Ranong', region: 'ภาคใต้' },
  { name_th: 'สงขลา', name_en: 'Songkhla', region: 'ภาคใต้' },
  { name_th: 'สตูล', name_en: 'Satun', region: 'ภาคใต้' },
  { name_th: 'สุราษฎร์ธานี', name_en: 'Surat Thani', region: 'ภาคใต้' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Surface Types
  for (const name of surfaceTypes) {
    await prisma.surfaceType.upsert({
      where: { id: surfaceTypes.indexOf(name) + 1 },
      update: { name },
      create: { name },
    });
  }
  console.log(`✅ ${surfaceTypes.length} surface types`);

  // Provinces
  for (const p of provinces) {
    await prisma.province.upsert({
      where: { id: provinces.indexOf(p) + 1 },
      update: p,
      create: p,
    });
  }
  console.log(`✅ ${provinces.length} provinces`);

  // Districts for Bangkok (เขตสำคัญ)
  const bangkok = await prisma.province.findFirst({ where: { name_en: 'Bangkok' } });
  if (bangkok) {
    const bkkDistricts = [
      'พระนคร', 'ดุสิต', 'หนองจอก', 'บางรัก', 'บางเขน', 'บางกอกน้อย',
      'บางกอกใหญ่', 'ห้วยขวาง', 'คลองสาน', 'ตลิ่งชัน', 'บางกอกน้อย',
      'บึงกุ่ม', 'สาทร', 'บางซื่อ', 'จตุจักร', 'บางเขน', 'ดอนเมือง',
      'ราษฎร์บูรณะ', 'หลักสี่', 'ลาดกระบัง', 'ยานนาวา', 'สัมพันธวงศ์',
      'พระโขนง', 'มีนบุรี', 'ลาดพร้าว', 'วังทองหลาง', 'คลองสาน',
      'คันนายาว', 'สาทร', 'บางแค', 'ลาดกระบัง', 'วัฒนา', 'บางนา',
      'ทวีวัฒนา', 'ทุ่งครุ', 'บางบอน', 'ปทุมวัน', 'ป้อมปราบศัตรูพ่าย',
      'พระโขนง', 'มีนบุรี', 'บึงกุ่ม', 'สาทร', 'บางซื่อ', 'จตุจักร',
      'บางเขน', 'ดอนเมือง', 'ราษฎร์บูรณะ', 'หลักสี่', 'ลาดกระบัง',
    ];
    for (const name_th of [...new Set(bkkDistricts)].slice(0, 30)) {
      await prisma.district.upsert({
        where: { id: (await prisma.district.findFirst({ where: { province_id: bangkok.id, name_th } }))?.id ?? -1 },
        update: {},
        create: { province_id: bangkok.id, name_th },
      }).catch(() => prisma.district.create({ data: { province_id: bangkok.id, name_th } }));
    }
    console.log('✅ Bangkok districts');
  }

  // Chiang Mai districts (ตัวอย่าง)
  const chiangMai = await prisma.province.findFirst({ where: { name_en: 'Chiang Mai' } });
  if (chiangMai) {
    const cmDistricts = ['เมืองเชียงใหม่', 'จอมทอง', 'แม่แจ่ม', 'เชียงดาว', 'ดอยสะเก็ด', 'แม่แตง', 'แม่ริม', 'สะเมิง', 'ฝาง', 'แม่อาย', 'พร้าว', 'สันป่าตอง', 'สันกำแพง', 'สันทราย', 'หางดง', 'ฮอด', 'ดอยเต่า', 'อมก๋อย', 'สารภี', 'เวียงแหง', 'ไชยปราการ', 'แม่วาง', 'แม่ออน', 'ดอยหล่อ', 'กัลยาณิวัฒนา'];
    for (const name_th of cmDistricts) {
      await prisma.district.create({ data: { province_id: chiangMai.id, name_th } }).catch(() => {});
    }
    console.log('✅ Chiang Mai districts');
  }

  // Admin account
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@tennis-online.th' },
    update: {},
    create: {
      name: 'ผู้ดูแลระบบ',
      email: 'admin@tennis-online.th',
      password_hash: adminHash,
    },
  });
  console.log('✅ Admin: admin@tennis-online.th / admin123');

  // Test Ambassador
  const bkk = await prisma.province.findFirst({ where: { name_en: 'Bangkok' } });
  if (bkk) {
    const ambHash = await bcrypt.hash('ambassador123', 10);
    await prisma.ambassador.upsert({
      where: { email: 'ambassador@tennis-online.th' },
      update: {},
      create: {
        full_name: 'ศิริลักษณ์ ใจดี',
        province_id: bkk.id,
        district_zone: 'กรุงเทพ เขตเหนือ',
        tennis_role: 'Player',
        phone: '0891234567',
        line_id: 'siriluck_tennis',
        email: 'ambassador@tennis-online.th',
        password_hash: ambHash,
        consent_accepted: true,
        status: 'approved',
        approved_at: new Date(),
      },
    });
    console.log('✅ Ambassador: ambassador@tennis-online.th / ambassador123');
  }

  console.log('\n🎾 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
