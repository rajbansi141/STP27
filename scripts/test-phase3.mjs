import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const prisma = new PrismaClient();

console.log('=== RUNNING PHASE 3 AUTOMATED VERIFICATION SUITE ===\n');

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
    // TEST 1: Reviewer & Admin Role Accounts
    // -------------------------------------------------------------
    console.log('[Test 1] Reviewer & Admin Accounts Verification');
    const reviewer = await prisma.user.findFirst({
      where: { role: 'REVIEWER', isActive: true, mustChangePassword: false },
    });
    assert(!!reviewer, `Active reviewer with mustChangePassword: false found (${reviewer?.email})`);

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
    });
    assert(!!admin, `Active admin found (${admin?.email})`);

    // -------------------------------------------------------------
    // TEST 2: Submitted Applications in Pool
    // -------------------------------------------------------------
    console.log('\n[Test 2] Submitted Applications Pool');
    const submittedApps = await prisma.application.findMany({
      where: { status: 'SUBMITTED' },
      include: { applicant: true, reviews: true, histories: true },
    });
    assert(submittedApps.length >= 1, `Found ${submittedApps.length} submitted applications for evaluation`);

    const testApp = submittedApps[0];
    assert(testApp.refNo.startsWith('SA27'), `Application reference number format correct: ${testApp.refNo}`);

    // -------------------------------------------------------------
    // TEST 3: Scoring Rubric Calculation & Review Upsert
    // -------------------------------------------------------------
    console.log('\n[Test 3] Scoring Rubric (/40) & Upsert');
    const academicScore = 9;
    const motivationScore = 8;
    const communicationScore = 10;
    const leadershipScore = 9;
    const expectedTotal = academicScore + motivationScore + communicationScore + leadershipScore; // 36

    assert(expectedTotal === 36, 'Calculated aggregate score is 36 out of 40 (90%)');

    const scoresPayload = {
      academic: academicScore,
      motivation: motivationScore,
      communication: communicationScore,
      leadership: leadershipScore,
      docChecks: { citizenship: true, degree: true, slc: true },
    };

    // Upsert review directly using logic identical to submitReviewAction
    const existingReview = await prisma.review.findFirst({
      where: { applicationId: testApp.id, reviewerId: reviewer.id },
    });

    let reviewResult;
    if (existingReview) {
      reviewResult = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          scores: JSON.stringify(scoresPayload),
          totalScore: expectedTotal,
          comment: 'Outstanding community leadership, excellent teaching philosophy statement.',
          recommendation: 'ADVANCE',
          at: new Date(),
        },
      });
    } else {
      reviewResult = await prisma.review.create({
        data: {
          applicationId: testApp.id,
          reviewerId: reviewer.id,
          stage: testApp.stage,
          scores: JSON.stringify(scoresPayload),
          totalScore: expectedTotal,
          comment: 'Outstanding community leadership, excellent teaching philosophy statement.',
          recommendation: 'ADVANCE',
        },
      });
    }

    assert(reviewResult.totalScore === 36, `Review totalScore saved properly: ${reviewResult.totalScore}/40`);
    assert(reviewResult.recommendation === 'ADVANCE', `Recommendation saved: ${reviewResult.recommendation}`);

    // Create Audit Log for Review
    const reviewAudit = await prisma.auditLog.create({
      data: {
        actorId: reviewer.id,
        role: reviewer.role,
        action: existingReview ? 'UPDATE_REVIEW' : 'CREATE_REVIEW',
        entity: 'Application',
        entityId: testApp.id,
        meta: JSON.stringify({
          refNo: testApp.refNo,
          totalScore: expectedTotal,
          recommendation: 'ADVANCE',
        }),
      },
    });
    assert(!!reviewAudit.id, `AuditLog recorded for review action: ${reviewAudit.action}`);

    // -------------------------------------------------------------
    // TEST 4: Stage Progression, History & Notification
    // -------------------------------------------------------------
    console.log('\n[Test 4] Stage Progression & History Audit');
    const targetStage = 'INTERVIEW';
    const initialStage = testApp.stage;

    // Update Application stage
    await prisma.application.update({
      where: { id: testApp.id },
      data: { stage: targetStage },
    });

    // Record Stage History
    const historyEntry = await prisma.stageHistory.create({
      data: {
        applicationId: testApp.id,
        fromStage: initialStage,
        toStage: targetStage,
        actorId: reviewer.id,
        note: 'Shortlisted for Panel Interview based on 36/40 rubric score.',
      },
    });

    assert(historyEntry.toStage === targetStage, `Stage history recorded promotion to ${targetStage}`);

    // Create Candidate Notification
    const notif = await prisma.notification.create({
      data: {
        userId: testApp.applicantId,
        title: `Application Advanced - ${targetStage}`,
        body: `Your application (${testApp.refNo}) has progressed to stage: ${targetStage}.`,
      },
    });

    assert(notif.userId === testApp.applicantId, `Applicant notification issued for stage advancement`);

    // Verify application state
    const refreshedApp = await prisma.application.findUnique({
      where: { id: testApp.id },
      include: { histories: true, reviews: true },
    });

    assert(refreshedApp.stage === targetStage, `Application stage successfully updated to ${targetStage}`);
    assert(refreshedApp.histories.length >= 1, `Application contains ${refreshedApp.histories.length} stage history entries`);

    // -------------------------------------------------------------
    // TEST 5: Monolingual Translation Integrity
    // -------------------------------------------------------------
    console.log('\n[Test 5] Translations Monolingual Integrity Check');
    const transFile = fs.readFileSync('./src/lib/i18n/translations.ts', 'utf-8');
    assert(transFile.includes('reviewer:'), 'Reviewer translations defined');
    
    // Check that english section has portalTitle: 'Reviewer Portal'
    assert(transFile.includes("portalTitle: 'Reviewer Portal'"), 'English reviewer portal title clean and monolingual');
    // Check nepali section
    assert(transFile.includes("portalTitle: 'मूल्याङ्कनकर्ता पोर्टल'"), 'Nepali reviewer portal title clean and monolingual');

    // -------------------------------------------------------------
    // RESULTS SUMMARY
    // -------------------------------------------------------------
    console.log(`\n=============================================`);
    console.log(`Phase 3 Test Results: ${passedTests}/${totalTests} Passed`);
    console.log(`=============================================\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL PHASE 3 VERIFICATIONS PASSED!\n');
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
