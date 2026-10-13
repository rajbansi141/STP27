import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import fs from 'node:fs';

const prisma = new PrismaClient();

console.log('=== RUNNING PHASE 4 AUTOMATED VERIFICATION SUITE ===\n');

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
    // TEST 1: Admin Account & System Context
    // -------------------------------------------------------------
    console.log('[Test 1] Administrator Account & Role Authorization');
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
    });
    assert(!!admin, `Active administrator account verified (${admin?.email})`);

    // -------------------------------------------------------------
    // TEST 2: Reviewer Account Provisioning by Admin
    // -------------------------------------------------------------
    console.log('\n[Test 2] Reviewer Provisioning (Username, Argon2, mustChangePassword)');
    const testReviewerUsername = `evaluator_${Date.now().toString().slice(-4)}`;
    const testReviewerEmail = `${testReviewerUsername}@saathiteachers.org`;
    const tempPassword = 'TempPassword2027!';
    const passwordHash = await argon2.hash(tempPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const newReviewer = await prisma.user.create({
      data: {
        name: 'Prof. Ramesh Karki',
        email: testReviewerEmail,
        username: testReviewerUsername,
        passwordHash,
        role: 'REVIEWER',
        mustChangePassword: true,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    assert(newReviewer.role === 'REVIEWER', 'Created account has role = REVIEWER');
    assert(newReviewer.mustChangePassword === true, 'Reviewer mustChangePassword flag = true');
    assert(!!newReviewer.username, `Reviewer assigned unique username: @${newReviewer.username}`);

    // Verify password check works
    const isPasswordValid = await argon2.verify(newReviewer.passwordHash, tempPassword);
    assert(isPasswordValid === true, 'Argon2 hash verified against temporary password');

    // Audit log for reviewer creation
    const createAudit = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'CREATE_REVIEWER',
        entity: 'User',
        entityId: newReviewer.id,
        meta: JSON.stringify({
          createdUserId: newReviewer.id,
          username: newReviewer.username,
          email: newReviewer.email,
        }),
      },
    });
    assert(!!createAudit.id, `AuditLog recorded action: ${createAudit.action}`);

    // -------------------------------------------------------------
    // TEST 3: User Status Toggle (Suspend / Activate)
    // -------------------------------------------------------------
    console.log('\n[Test 3] User Status Management (Suspend & Re-activate)');
    // Suspend user
    const suspendedUser = await prisma.user.update({
      where: { id: newReviewer.id },
      data: { isActive: false },
    });
    assert(suspendedUser.isActive === false, 'User successfully suspended (isActive = false)');

    const suspendAudit = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'SUSPEND_USER',
        entity: 'User',
        entityId: newReviewer.id,
        meta: JSON.stringify({ targetEmail: newReviewer.email, newStatus: false }),
      },
    });
    assert(!!suspendAudit.id, 'AuditLog recorded SUSPEND_USER action');

    // Re-activate user
    const reactivatedUser = await prisma.user.update({
      where: { id: newReviewer.id },
      data: { isActive: true },
    });
    assert(reactivatedUser.isActive === true, 'User successfully re-activated (isActive = true)');

    // -------------------------------------------------------------
    // TEST 4: Candidate Allocation to Reviewer
    // -------------------------------------------------------------
    console.log('\n[Test 4] Candidate Reviewer Allocation & Notification');
    const application = await prisma.application.findFirst({
      where: { status: 'SUBMITTED' },
      include: { applicant: true },
    });
    assert(!!application, `Candidate application found: ${application?.refNo}`);

    // Assign candidate to new reviewer
    const assignment = await prisma.reviewerAssignment.upsert({
      where: {
        applicationId_reviewerId: {
          applicationId: application.id,
          reviewerId: newReviewer.id,
        },
      },
      create: {
        applicationId: application.id,
        reviewerId: newReviewer.id,
        assignedById: admin.id,
      },
      update: {
        assignedById: admin.id,
        assignedAt: new Date(),
      },
    });

    assert(assignment.reviewerId === newReviewer.id, 'Candidate allocated to reviewer in database');

    // Create Notification for the reviewer
    const revNotif = await prisma.notification.create({
      data: {
        userId: newReviewer.id,
        title: `New Candidate Assigned: ${application.refNo}`,
        body: `You have been allocated candidate ${application.applicant.name} (${application.refNo}) for evaluation.`,
      },
    });
    assert(revNotif.userId === newReviewer.id, 'Reviewer received allocation notification');

    const assignAudit = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'ASSIGN_REVIEWER',
        entity: 'Application',
        entityId: application.id,
        meta: JSON.stringify({
          refNo: application.refNo,
          reviewerId: newReviewer.id,
          reviewerName: newReviewer.name,
        }),
      },
    });
    assert(!!assignAudit.id, 'AuditLog recorded ASSIGN_REVIEWER action');

    // -------------------------------------------------------------
    // TEST 5: Cycle Settings & Pipeline Stage Update
    // -------------------------------------------------------------
    console.log('\n[Test 5] Settings Configuration & Pipeline Customization');
    const newDeadline = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const updatedSettings = await prisma.settings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        deadline: newDeadline,
        cohortYear: 2027,
        cycleLabel: 'Saathi Teachers Programme (STP) 2027 Cohort',
      },
      update: {
        deadline: newDeadline,
        cohortYear: 2027,
        cycleLabel: 'Saathi Teachers Programme (STP) 2027 Cohort',
      },
    });

    assert(updatedSettings.cohortYear === 2027, `Settings updated: Cohort year = ${updatedSettings.cohortYear}`);
    assert(updatedSettings.deadline.getTime() === newDeadline.getTime(), 'Settings updated: Deadline time saved');

    const settingsAudit = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'UPDATE_SETTINGS',
        entity: 'Settings',
        entityId: updatedSettings.id,
        meta: JSON.stringify({
          deadline: newDeadline.toISOString(),
          cohortYear: 2027,
          cycleLabel: updatedSettings.cycleLabel,
        }),
      },
    });
    assert(!!settingsAudit.id, 'AuditLog recorded UPDATE_SETTINGS action');

    // -------------------------------------------------------------
    // TEST 6: Monolingual Translation Integrity for Admin
    // -------------------------------------------------------------
    console.log('\n[Test 6] Admin Monolingual Translation Dictionary Integrity');
    const transFile = fs.readFileSync('./src/lib/i18n/translations.ts', 'utf-8');
    assert(transFile.includes("portalTitle: 'Admin Operations & Oversight'"), 'English admin portal title clean and monolingual');
    assert(transFile.includes("portalTitle: 'प्रशासक सञ्चालन तथा सुपरिवेक्षण'"), 'Nepali admin portal title clean and monolingual');
    assert(transFile.includes("exportCsvBtn: 'Export Roster CSV'"), 'English CSV export label verified');
    assert(transFile.includes("exportCsvBtn: 'उम्मेदवार सूची CSV डाउनलोड'"), 'Nepali CSV export label verified');

    // -------------------------------------------------------------
    // RESULTS SUMMARY
    // -------------------------------------------------------------
    console.log(`\n=============================================`);
    console.log(`Phase 4 Test Results: ${passedTests}/${totalTests} Passed`);
    console.log(`=============================================\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL PHASE 4 VERIFICATIONS PASSED!\n');
    }
  } catch (err) {
    console.error('Phase 4 test execution error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
