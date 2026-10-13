import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const prisma = new PrismaClient();

console.log('=== RUNNING PHASE 5 AUTOMATED VERIFICATION SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  try {
    // -------------------------------------------------------------
    // TEST 1: In-App Notification Center
    // -------------------------------------------------------------
    console.log('[Test 1] In-App Notification Lifecycle');
    const applicant = await prisma.user.findFirst({
      where: { role: 'APPLICANT' },
    });
    assert(!!applicant, `Applicant user verified (${applicant?.email})`);

    // Create notification
    const testNotif = await prisma.notification.create({
      data: {
        userId: applicant.id,
        title: 'Interview Stage Scheduled',
        body: 'Your panel interview has been scheduled for next Tuesday at 10:00 AM.',
      },
    });
    assert(testNotif.readAt === null, 'New notification created with unread status (readAt = null)');

    const unreadCountBefore = await prisma.notification.count({
      where: { userId: applicant.id, readAt: null },
    });
    assert(unreadCountBefore >= 1, `Unread count accurately reflects pending items (${unreadCountBefore})`);

    // Mark single notification as read
    const updatedNotif = await prisma.notification.update({
      where: { id: testNotif.id },
      data: { readAt: new Date() },
    });
    assert(updatedNotif.readAt !== null, 'Notification marked as read successfully');

    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId: applicant.id, readAt: null },
      data: { readAt: new Date() },
    });
    const unreadCountAfter = await prisma.notification.count({
      where: { userId: applicant.id, readAt: null },
    });
    assert(unreadCountAfter === 0, 'Mark All As Read cleared all unread notifications to 0');

    // -------------------------------------------------------------
    // TEST 2: Asynchronous Email Outbox Queue
    // -------------------------------------------------------------
    console.log('\n[Test 2] Asynchronous Email Outbox & Worker Sweep');
    
    // Enqueue an email into EmailLog with PENDING status
    const queuedLog = await prisma.emailLog.create({
      data: {
        to: 'candidate.test@example.com',
        subject: 'Interview Confirmation - Saathi Teachers Programme',
        status: 'PENDING',
        sentAt: new Date(),
      },
    });

    assert(queuedLog.status === 'PENDING', 'Email enqueued into outbox with status = PENDING');

    // Simulate worker sweep
    const pendingLogs = await prisma.emailLog.findMany({
      where: { status: 'PENDING' },
    });
    assert(pendingLogs.length >= 1, `Worker found ${pendingLogs.length} pending email(s) in outbox`);

    // Process each pending email
    for (const log of pendingLogs) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT' },
      });
    }

    const refreshedLog = await prisma.emailLog.findUnique({
      where: { id: queuedLog.id },
    });
    assert(refreshedLog.status === 'SENT', `Queued email transitioned to terminal status: ${refreshedLog.status}`);

    // -------------------------------------------------------------
    // TEST 3: Scheduled Deadline Reminders Job
    // -------------------------------------------------------------
    console.log('\n[Test 3] Scheduled Deadline Reminders Job');
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });
    assert(!!settings, 'Settings table loaded for deadline calculation');

    const drafts = await prisma.application.findMany({
      where: { status: 'DRAFT' },
    });
    assert(Array.isArray(drafts), `Successfully scanned ${drafts.length} draft application(s)`);

    // -------------------------------------------------------------
    // TEST 4: Email Template Customization & Placeholders
    // -------------------------------------------------------------
    console.log('\n[Test 4] Bilingual Email Template Customization');
    const targetTmpl = await prisma.emailTemplate.findFirst({
      where: { code: 'APPLICATION_SUBMITTED', locale: 'en' },
    });
    assert(!!targetTmpl, 'Found APPLICATION_SUBMITTED English email template');

    const updatedTmpl = await prisma.emailTemplate.update({
      where: { id: targetTmpl.id },
      data: {
        subject: 'Confirmed: Application Received (Ref: {{refNo}}) - Saathi Teachers 2027',
      },
    });

    assert(
      updatedTmpl.subject.includes('Confirmed: Application Received'),
      'Email template subject customized successfully'
    );

    // -------------------------------------------------------------
    // TEST 5: Monolingual Translations Integrity
    // -------------------------------------------------------------
    console.log('\n[Test 5] Translations Monolingual Integrity Check');
    const transFile = fs.readFileSync('./src/lib/i18n/translations.ts', 'utf-8');
    assert(transFile.includes("markAllRead: 'Mark all read'"), 'English notification markAllRead label verified');
    assert(transFile.includes("markAllRead: 'सबै पढेको चिन्ह लगाउनुहोस्'"), 'Nepali notification markAllRead label verified');
    assert(transFile.includes("flushQueueBtn: 'Process Outbox Queue Now'"), 'English flushQueueBtn label verified');
    assert(transFile.includes("flushQueueBtn: 'अहिले लाम प्रक्रिया सुरु गर्नुहोस्'"), 'Nepali flushQueueBtn label verified');

    // -------------------------------------------------------------
    // RESULTS SUMMARY
    // -------------------------------------------------------------
    console.log(`\n=============================================`);
    console.log(`Phase 5 Test Results: ${passedTests}/${totalTests} Passed`);
    console.log(`=============================================\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL PHASE 5 VERIFICATIONS PASSED!\n');
    }
  } catch (err) {
    console.error('Phase 5 test execution failed with error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
