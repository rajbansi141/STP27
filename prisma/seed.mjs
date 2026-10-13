import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Saathi Teachers Programme (STP) 2027 database...');

  // 1. Settings
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {
      cohortYear: 2027,
      cycleLabel: 'Saathi Teachers Programme (STP) Application 2027',
      deadline: new Date('2027-04-30T23:59:59.000Z'),
    },
    create: {
      id: 'default',
      cohortYear: 2027,
      cycleLabel: 'Saathi Teachers Programme (STP) Application 2027',
      deadline: new Date('2027-04-30T23:59:59.000Z'),
    },
  });
  console.log('✓ Settings initialized:', settings.cycleLabel);

  // 2. Configurable Stages (Selection pipeline)
  const initialStages = [
    { code: 'APPLICATION', nameEn: 'Application', nameNe: 'आवेदन (Application)', order: 1 },
    { code: 'PHONE_INTERVIEW', nameEn: 'Phone Interview', nameNe: 'फोन अन्तर्वार्ता (Phone Interview)', order: 2 },
    { code: 'ASC', nameEn: 'Assessment of Saathi Candidates (ASC)', nameNe: 'साथी उम्मेदवार मूल्याङ्कन (ASC)', order: 3 },
    { code: 'PARENTS_MEET', nameEn: 'Parents’ Meet Event', nameNe: 'अभिभावक भेटघाट कार्यक्रम (Parents’ Meet Event)', order: 4 },
    { code: 'SAATHI_SCHOOL', nameEn: '24-Day Saathi School', nameNe: '२४-दिने साथी स्कुल (24-Day Saathi School)', order: 5 },
    { code: 'PLACEMENT', nameEn: 'Placement', nameNe: 'पदस्थापना (Placement)', order: 6 },
  ];

  // Clean up any obsolete stage records
  await prisma.stage.deleteMany({
    where: { code: { notIn: initialStages.map((s) => s.code) } },
  });

  for (const s of initialStages) {
    await prisma.stage.upsert({
      where: { code: s.code },
      update: { nameEn: s.nameEn, nameNe: s.nameNe, order: s.order, isActive: true },
      create: { code: s.code, nameEn: s.nameEn, nameNe: s.nameNe, order: s.order, isActive: true },
    });
  }
  console.log(`✓ ${initialStages.length} Configurable stages initialized`);

  // 3. Bilingual Email Templates
  const templates = [
    {
      code: 'SIGNUP_VERIFICATION',
      locale: 'en',
      subject: 'Verify your email for Saathi Teachers Programme 2027',
      body: '<p>Dear {{name}},</p><p>Thank you for registering for the Saathi Teachers Programme 2027.</p><p>Your 6-digit verification code is: <strong>{{code}}</strong></p><p>This code will expire in 24 hours.</p>',
    },
    {
      code: 'SIGNUP_VERIFICATION',
      locale: 'ne',
      subject: 'साथी शिक्षक कार्यक्रम २०२७ का लागि आफ्नो इमेल प्रमाणीकरण गर्नुहोस्',
      body: '<p>आदरणीय {{name}},</p><p>साथी शिक्षक कार्यक्रम २०२७ मा दर्ता गर्नुभएकोमा धन्यवाद।</p><p>तपाईंको ६ अङ्कको प्रमाणीकरण कोड हो: <strong>{{code}}</strong></p><p>यो कोड २४ घण्टासम्म मात्र मान्य रहनेछ।</p>',
    },
    {
      code: 'PASSWORD_RESET',
      locale: 'en',
      subject: 'Your Password Reset Code - Saathi Teachers Programme',
      body: '<p>Hello,</p><p>You requested a password reset for your Saathi Teachers Programme account.</p><p>Your 6-digit security code is: <strong>{{code}}</strong></p><p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>',
    },
    {
      code: 'PASSWORD_RESET',
      locale: 'ne',
      subject: 'पासवर्ड पुनःसेट सुरक्षा कोड - साथी शिक्षक कार्यक्रम',
      body: '<p>नमस्ते,</p><p>साथी शिक्षक कार्यक्रम खाताको लागि पासवर्ड पुनःसेट अनुरोध प्राप्त भएको छ।</p><p>तपाईंको ६ अङ्कको सुरक्षा कोड हो: <strong>{{code}}</strong></p><p>यो कोड १० मिनेटका लागि मात्र मान्य छ। यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, यसलाई बेवास्ता गर्नुहोस्।</p>',
    },
    {
      code: 'APPLICATION_SUBMITTED',
      locale: 'en',
      subject: 'Application Confirmation (Ref: {{refNo}}) - Saathi Teachers Programme 2027',
      body: '<p>Dear {{name}},</p><p>Your application for the Saathi Teachers Programme 2027 has been successfully received.</p><p>Official Reference Number: <strong>{{refNo}}</strong></p><p>Our selection committee will review your submission and notify you of next steps.</p>',
    },
    {
      code: 'APPLICATION_SUBMITTED',
      locale: 'ne',
      subject: 'आवेदन पेश सफल (दर्ता नं: {{refNo}}) - साथी शिक्षक कार्यक्रम २०२७',
      body: '<p>आदरणीय {{name}},</p><p>साथी शिक्षक कार्यक्रम २०२७ का लागि तपाईंको आवेदन सफलतापूर्वक प्राप्त भएको छ।</p><p>आधिकारिक दर्ता नम्बर: <strong>{{refNo}}</strong></p><p>हाम्रो छनोट समितिले तपाईंको आवेदन अध्ययन गरी आगामी चरणबारे जानकारी गराउनेछ।</p>',
    },
    {
      code: 'DEADLINE_REMINDER',
      locale: 'en',
      subject: 'Application Deadline Reminder - Saathi Teachers Programme 2027',
      body: '<p>Dear {{name}},</p><p>This is a reminder that the application deadline for the Saathi Teachers Programme 2027 is approaching on {{deadline}}.</p><p>Please log in and submit your draft application before the deadline cutoff.</p>',
    },
    {
      code: 'DEADLINE_REMINDER',
      locale: 'ne',
      subject: 'आवेदन पेश गर्ने म्याद स्मरण - साथी शिक्षक कार्यक्रम २०२७',
      body: '<p>आदरणीय {{name}},</p><p>साथी शिक्षक कार्यक्रम २०२७ को आवेदन पेश गर्ने अन्तिम म्याद {{deadline}} नजिकिँदैछ।</p><p>कृपया म्याद समाप्त हुनु अगावै आफ्नो ड्राफ्ट आवेदन पूरा गरी पेश गर्नुहोला।</p>',
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { code_locale: { code: t.code, locale: t.locale } },
      update: { subject: t.subject, body: t.body, active: true },
      create: { code: t.code, locale: t.locale, subject: t.subject, body: t.body, active: true },
    });
  }
  console.log(`✓ ${templates.length} Bilingual email templates initialized`);

  // 4. Seed Users
  // Admin
  const adminPasswordHash = await argon2.hash('AdminPassword123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@saathiteachers.org' },
    update: {
      name: 'STP Admin Coordinator',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      name: 'STP Admin Coordinator',
      email: 'admin@saathiteachers.org',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      locale: 'en',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log('✓ Admin user seeded: admin@saathiteachers.org / AdminPassword123!');

  // Reviewer (Committee member with mustChangePassword=true to verify flow)
  const reviewerPasswordHash = await argon2.hash('ReviewerPassword123!');
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@saathiteachers.org' },
    update: {
      name: 'Bikash Sharma (Selection Committee)',
      username: 'reviewer1',
      passwordHash: reviewerPasswordHash,
      role: 'REVIEWER',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      name: 'Bikash Sharma (Selection Committee)',
      email: 'reviewer@saathiteachers.org',
      username: 'reviewer1',
      passwordHash: reviewerPasswordHash,
      role: 'REVIEWER',
      locale: 'ne',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log('✓ Reviewer user seeded: reviewer@saathiteachers.org (or user "reviewer1") / ReviewerPassword123! [mustChangePassword=true]');

  // Reviewer 1 Profile & Stage Assignments
  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer.id },
    update: {
      nameNe: 'बिकास शर्मा',
      phone: '+977-9841234567',
      designation: 'Senior Education Specialist',
      committeeRole: 'Member',
      blindReview: true,
      assignedPositions: 'Primary Teacher, Lower Secondary Teacher',
      assignedStages: 'APPLICATION,PHONE_INTERVIEW,ASC',
    },
    create: {
      userId: reviewer.id,
      nameNe: 'बिकास शर्मा',
      phone: '+977-9841234567',
      designation: 'Senior Education Specialist',
      committeeRole: 'Member',
      blindReview: true,
      assignedPositions: 'Primary Teacher, Lower Secondary Teacher',
      assignedStages: 'APPLICATION,PHONE_INTERVIEW,ASC',
    },
  });

  for (const stg of ['APPLICATION', 'PHONE_INTERVIEW', 'ASC']) {
    await prisma.stageAssignment.upsert({
      where: { reviewerId_stageCode: { reviewerId: reviewer.id, stageCode: stg } },
      update: {},
      create: { reviewerId: reviewer.id, stageCode: stg },
    });
  }

  // Sample Applicant
  const applicantPasswordHash = await argon2.hash('ApplicantPass123!');
  const applicant = await prisma.user.upsert({
    where: { email: 'applicant@example.com' },
    update: {
      name: 'Pooja Thapa',
      passwordHash: applicantPasswordHash,
      role: 'APPLICANT',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      name: 'Pooja Thapa',
      email: 'applicant@example.com',
      passwordHash: applicantPasswordHash,
      role: 'APPLICANT',
      locale: 'en',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log('✓ Applicant user seeded: applicant@example.com / ApplicantPass123!');

  // Reviewer 2 (Ready to review immediately without mandatory password change)
  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@saathiteachers.org' },
    update: {
      name: 'Sunita Gurung (Selection Committee)',
      username: 'reviewer2',
      passwordHash: reviewerPasswordHash,
      role: 'REVIEWER',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      name: 'Sunita Gurung (Selection Committee)',
      email: 'reviewer2@saathiteachers.org',
      username: 'reviewer2',
      passwordHash: reviewerPasswordHash,
      role: 'REVIEWER',
      locale: 'en',
      emailVerified: new Date(),
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log('✓ Reviewer 2 seeded: reviewer2@saathiteachers.org (user "reviewer2") / ReviewerPassword123!');

  // Reviewer 2 Profile & Stage Assignments
  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer2.id },
    update: {
      nameNe: 'सुनिता गुरुङ',
      phone: '+977-9851098765',
      designation: 'Pedagogy & Curriculum Lead',
      committeeRole: 'Subject Expert',
      blindReview: true,
      assignedPositions: 'Primary Teacher, Secondary STEM Teacher',
      assignedStages: 'APPLICATION,ASC,PARENTS_MEET',
    },
    create: {
      userId: reviewer2.id,
      nameNe: 'सुनिता गुरुङ',
      phone: '+977-9851098765',
      designation: 'Pedagogy & Curriculum Lead',
      committeeRole: 'Subject Expert',
      blindReview: true,
      assignedPositions: 'Primary Teacher, Secondary STEM Teacher',
      assignedStages: 'APPLICATION,ASC,PARENTS_MEET',
    },
  });

  for (const stg of ['APPLICATION', 'ASC', 'PARENTS_MEET']) {
    await prisma.stageAssignment.upsert({
      where: { reviewerId_stageCode: { reviewerId: reviewer2.id, stageCode: stg } },
      update: {},
      create: { reviewerId: reviewer2.id, stageCode: stg },
    });
  }

  // Extra Applicants for realistic candidate pool
  const applicant2 = await prisma.user.upsert({
    where: { email: 'suman@example.com' },
    update: { name: 'Suman Shrestha', passwordHash: applicantPasswordHash, role: 'APPLICANT', emailVerified: new Date() },
    create: { name: 'Suman Shrestha', email: 'suman@example.com', passwordHash: applicantPasswordHash, role: 'APPLICANT', emailVerified: new Date() },
  });

  const applicant3 = await prisma.user.upsert({
    where: { email: 'anil@example.com' },
    update: { name: 'Anil Adhikari', passwordHash: applicantPasswordHash, role: 'APPLICANT', emailVerified: new Date() },
    create: { name: 'Anil Adhikari', email: 'anil@example.com', passwordHash: applicantPasswordHash, role: 'APPLICANT', emailVerified: new Date() },
  });

  // Seed 3 Submitted Applications
  const essaySample1 = "I am deeply drawn to teaching in rural community schools because education is the bedrock of equitable human development. Growing up in Nepal, I witnessed firsthand the vast disparity in learning opportunities between urban centres and remote villages. Through the Saathi Teachers Programme, I want to bridge this critical gap by delivering active, inquiry-based pedagogical methods directly to grassroots classrooms. In the long run, this 2-year immersive experience will equip me with authentic empathy, ground-level policy comprehension, and resilient leadership skills needed to advance transformative educational reform in Nepal.";
  const essaySample2 = "The teacher who impacted me most was Mr. Karki, who taught science in secondary school. Rather than relying solely on rote textbook memorization, he encouraged curiosity, took us outside to study natural ecosystems, and treated every question with respect and dignity. The attributes I seek to embody are his unwavering patience, his enthusiasm for interactive inquiry, and his ability to see leadership potential in every student regardless of their academic background.";
  const essaySample3 = "During my third year at university, our community student group initiated a volunteer literacy drive in a flood-affected district. Due to sudden road blockages and scarce supplies, our original curriculum became untenable. I took the lead in re-organizing our schedule, collaborating with local youth clubs to secure community spaces, and designing improvisational teaching resources using local materials. This taught me adaptability, collaborative crisis management, and the power of grassroots trust.";

  const app1Data = {
    fullName: 'Pooja Thapa',
    dob: '1999-04-28',
    gender: 'female',
    nationality: 'Nepali',
    contactNumber: '9841234567',
    currentCountry: 'Nepal',
    currentProvince: 'Bagmati Province',
    currentMunicipality: 'Kathmandu Metropolitan',
    currentWard: '4',
    sameAsCurrent: true,
    permanentCountry: 'Nepal',
    permanentProvince: 'Bagmati Province',
    permanentMunicipality: 'Kathmandu Metropolitan',
    permanentWard: '4',
    highestLevel: "Bachelor's Degree",
    fieldOfStudy: 'Mathematics Education',
    university: 'Tribhuvan University',
    gradYear: '2023',
    slcDivision: 'Distinction (3.8 GPA)',
    experiences: [
      { organization: 'Child Haven NGO', role: 'Mathematics Tutor', durationYears: '1', description: 'Conducted remedial mathematics classes for underrepresented basic level students.' },
    ],
    essay1: essaySample1,
    essay2: essaySample2,
    essay3: essaySample3,
    commitment2Years: 'yes',
    preServiceTraining: 'yes',
    villageEmpowerment: 'yes',
    opportunityDistribution: 'no',
    teachingSubject: 'math',
    cvFileName: 'Pooja_Thapa_CV.pdf',
    cvFileUrl: '/api/files/Pooja_Thapa_CV.pdf',
  };

  const app1 = await prisma.application.upsert({
    where: { refNo: 'SA270001K7QM' },
    update: {
      status: 'SUBMITTED',
      stage: 'APPLICATION',
      submittedAt: new Date(Date.now() - 3600000 * 24),
      data: JSON.stringify(app1Data),
    },
    create: {
      refNo: 'SA270001K7QM',
      applicantId: applicant.id,
      year: 2027,
      seq: 1,
      status: 'SUBMITTED',
      stage: 'APPLICATION',
      submittedAt: new Date(Date.now() - 3600000 * 24),
      data: JSON.stringify(app1Data),
    },
  });

  const app2Data = {
    ...app1Data,
    fullName: 'Suman Shrestha',
    contactNumber: '9851122334',
    fieldOfStudy: 'English Literature & Linguistics',
    university: 'Kathmandu University',
    gradYear: '2024',
    teachingSubject: 'english',
    cvFileName: 'Suman_Shrestha_CV.pdf',
  };

  const app2 = await prisma.application.upsert({
    where: { refNo: 'SA270002M9PL' },
    update: {
      status: 'SUBMITTED',
      stage: 'APPLICATION',
      submittedAt: new Date(Date.now() - 3600000 * 48),
      data: JSON.stringify(app2Data),
    },
    create: {
      refNo: 'SA270002M9PL',
      applicantId: applicant2.id,
      year: 2027,
      seq: 2,
      status: 'SUBMITTED',
      stage: 'APPLICATION',
      submittedAt: new Date(Date.now() - 3600000 * 48),
      data: JSON.stringify(app2Data),
    },
  });

  const app3Data = {
    ...app1Data,
    fullName: 'Anil Adhikari',
    contactNumber: '9860998877',
    fieldOfStudy: 'Primary Education Pedagogy',
    university: 'Pokhara University',
    gradYear: '2022',
    teachingSubject: 'grade_teaching',
    cvFileName: 'Anil_Adhikari_CV.pdf',
  };

  const app3 = await prisma.application.upsert({
    where: { refNo: 'SA270003N4RT' },
    update: {
      status: 'SUBMITTED',
      stage: 'APPLICATION',
      submittedAt: new Date(Date.now() - 3600000 * 12),
      data: JSON.stringify(app3Data),
    },
    create: {
      refNo: 'SA270003N4RT',
      applicantId: applicant3.id,
      year: 2027,
      seq: 3,
      status: 'SUBMITTED',
      stage: 'APPLICATION',
      submittedAt: new Date(Date.now() - 3600000 * 12),
      data: JSON.stringify(app3Data),
    },
  });

  // Assign Reviewers
  await prisma.reviewerAssignment.upsert({
    where: { applicationId_reviewerId: { applicationId: app1.id, reviewerId: reviewer2.id } },
    update: {},
    create: { applicationId: app1.id, reviewerId: reviewer2.id, assignedById: admin.id },
  });

  await prisma.reviewerAssignment.upsert({
    where: { applicationId_reviewerId: { applicationId: app2.id, reviewerId: reviewer2.id } },
    update: {},
    create: { applicationId: app2.id, reviewerId: reviewer2.id, assignedById: admin.id },
  });

  await prisma.reviewerAssignment.upsert({
    where: { applicationId_reviewerId: { applicationId: app3.id, reviewerId: reviewer2.id } },
    update: {},
    create: { applicationId: app3.id, reviewerId: reviewer2.id, assignedById: admin.id },
  });

  // Seed 1 Sample Completed Review on app2 (Suman Shrestha)
  const existingReview = await prisma.review.findFirst({
    where: { applicationId: app2.id, reviewerId: reviewer2.id },
  });
  if (!existingReview) {
    await prisma.review.create({
      data: {
        applicationId: app2.id,
        reviewerId: reviewer2.id,
        stage: 'APPLICATION',
        scores: JSON.stringify({
          academic: 9,
          motivation: 9,
          communication: 8,
          leadership: 9,
        }),
        totalScore: 35,
        comment: 'Outstanding academic credentials and lucid essays. Candidate exhibits mature dedication to rural educational reform.',
        recommendation: 'ADVANCE',
      },
    });
  }

  console.log('✓ 3 Sample submitted applications & reviewer assignments seeded successfully.');
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
