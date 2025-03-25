"use server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });
  if (!user) throw new Error("User not found");
  try {
    const result = await db.$transaction(
      async (tx) => {
        // find if industries exist
        let industriesInsight = await tx.industry.findUnique({
          where: {
            industry: data.industry,
          },
        });
        // if industries are not there , create them in default
        if (!industriesInsight) {
          industriesInsight = await tx.industriesInsight.create({
            data: {
              industry: data.industry,
              salaryRanges: [],
              growthRate: 0,
              demandLevel: "Medium",
              topSkills: [],
              marketOutlook: "Neutral",
              recommendedSkills: [],
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
        // update the user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });
        return { updatedUser, industriesInsight };
      },
      {
        timeout: 10000,
      }
    );
    return result.user;
  } catch (error) {
    console.log("Error updating user", error.message);
    throw new Error("Failed to update user");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });
  if (!user) throw new Error("User not found");
  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });
    return {
        isOnboarded: !!user?.industry,
    }
  } catch (error) {
    console.log("Error getting user onboarding status", error.message);
    throw new Error("Failed to get user onboarding status");
    
  }
}
