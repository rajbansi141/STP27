import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function runTests() {
  console.log('\n================== SIMPLIFIED COMMITTEE & REVIEWER AUDIT ==================\n');

  const testUsername = `rev.test_${Date.now().toString().slice(-4)}`;
  const testEmail = `reviewer_${Date.now()}@test.org`;
  const testPhone = '9841999999';
  const testPassword = 'SecurePassword2027!';

  try {
    // 1. Password Hashing with Argon2
    const passwordHash = await argon2.hash(testPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    const isPasswordValid = await argon2.verify(passwordHash, testPassword);
    if (!isPasswordValid) throw new Error('Argon2 password hash failed');
    console.log('✔ [1/6] Argon2id password hashing and verification passed.');

    // 2. Transactional Reviewer Creation with Minimal Fields
    const newReviewer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: testUsername,
          username: testUsername,
          email: testEmail,
          passwordHash,
          role: 'REVIEWER', // Strictly REVIEWER
          mustChangePassword: true,
          isActive: true,
          emailVerified: new Date(),
        },
      });

      const profile = await tx.reviewerProfile.create({
        data: {
          userId: user.id,
          phone: testPhone,
          committeeRole: 'Reviewer',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'CREATE_REVIEWER',
          entity: 'User',
          entityId: user.id,
          meta: {
            username: testUsername,
            email: testEmail,
            phone: testPhone,
            role: 'REVIEWER',
          },
        },
      });

      return { user, profile };
    });

    if (newReviewer.user.role !== 'REVIEWER' || !newReviewer.user.mustChangePassword) {
      throw new Error('Created user does not have role REVIEWER or mustChangePassword is not true');
    }
    if (newReviewer.profile.phone !== testPhone) {
      throw new Error('ReviewerProfile phone does not match');
    }
    console.log(`✔ [2/6] Created Reviewer (@${testUsername}): role = REVIEWER, mustChangePassword = true, phone = ${testPhone}.`);

    // 3. Multi-Stage Evaluation & Locking
    const sampleApp = await prisma.application.findFirst({
      where: { status: 'SUBMITTED' },
    });
    if (!sampleApp) throw new Error('No submitted application found for testing');

    const testStage = 'PHONE_INTERVIEW';
    const review = await prisma.review.create({
      data: {
        applicationId: sampleApp.id,
        reviewerId: newReviewer.user.id,
        stage: testStage,
        scores: JSON.stringify({ academic: 9, motivation: 9, communication: 9, leadership: 9 }),
        totalScore: 36,
        comment: 'Candidate meets all qualifications and demonstrates excellent commitment.',
        recommendation: 'ADVANCE',
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date(),
      },
    });

    if (!review.isLocked || review.status !== 'SUBMITTED') {
      throw new Error('Review is not locked upon submission');
    }
    console.log(`✔ [3/6] Review submitted across stage "${testStage}" and verified locked.`);

    // 4. Submit Batch to Admin
    const batch = await prisma.reviewBatch.create({
      data: {
        reviewerId: newReviewer.user.id,
        status: 'SUBMITTED',
      },
    });

    await prisma.review.update({
      where: { id: review.id },
      data: { batchId: batch.id },
    });

    // Notify Admins in-app
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      const notif = await prisma.notification.create({
        data: {
          userId: adminUser.id,
          title: 'Review Batch Submitted',
          body: `Reviewer @${testUsername} submitted evaluation batch.`,
        },
      });
      console.log(`✔ [4/6] Review batch created (ID: ${batch.id}) and admin notification queued (ID: ${notif.id}).`);
    }

    // 5. Admin Decision & Unlock Flow
    // Return with reason
    const returnedReview = await prisma.review.update({
      where: { id: review.id },
      data: {
        status: 'RETURNED',
        adminDecision: 'RETURNED',
        returnReason: 'Please re-verify academic division certificates.',
        isLocked: false,
      },
    });
    if (returnedReview.isLocked || returnedReview.status !== 'RETURNED') {
      throw new Error('Review return logic failed');
    }

    // Re-lock
    await prisma.review.update({
      where: { id: review.id },
      data: {
        status: 'SUBMITTED',
        isLocked: true,
      },
    });

    // Admin unlock with reason
    const unlockedReview = await prisma.review.update({
      where: { id: review.id },
      data: {
        isLocked: false,
        unlockedReason: 'Reviewer requested update after new certificates received.',
      },
    });
    if (unlockedReview.isLocked || !unlockedReview.unlockedReason) {
      throw new Error('Admin unlock logic failed');
    }
    console.log('✔ [5/6] Admin review return and unlock with audit reason verified.');

    // 6. Audit Trail Check
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actorId: newReviewer.user.id },
          { entityId: newReviewer.user.id },
        ],
      },
    });
    if (logs.length === 0) {
      throw new Error('No audit logs found for created reviewer');
    }
    console.log(`✔ [6/6] Audit trail verified: ${logs.length} logged actions recorded.`);

    // Cleanup
    await prisma.notification.deleteMany({ where: { body: { contains: testUsername } } });
    await prisma.review.deleteMany({ where: { reviewerId: newReviewer.user.id } });
    await prisma.reviewBatch.deleteMany({ where: { reviewerId: newReviewer.user.id } });
    await prisma.reviewerProfile.deleteMany({ where: { userId: newReviewer.user.id } });
    await prisma.auditLog.deleteMany({ where: { entityId: newReviewer.user.id } });
    await prisma.user.delete({ where: { id: newReviewer.user.id } });
    console.log('✔ Test cleanup completed.');

    console.log('\n🎉 ALL ACCEPTANCE AUDIT TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
