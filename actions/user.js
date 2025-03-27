"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Format skills as array if string
    const formattedSkills = Array.isArray(data.skills)
      ? data.skills
      : (data.skills || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    // Ensure experience is an integer
    const experience =
      typeof data.experience === "string"
        ? parseInt(data.experience, 10)
        : data.experience;

    console.log(
      `Starting profile update for user ${user.id} with industry ${data.industry}`
    );

    // Start a transaction to handle both operations
    const result = await db.$transaction(
      async (tx) => {
        console.log("Transaction started");

        // IMPORTANT: First ensure the industry insight exists
        // Check if industry already exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it FIRST
        if (!industryInsight) {
          console.log(`Creating new industry insight for ${data.industry}`);
          try {
            // Try to generate insights with AI
            const insights = await generateAIInsights(data.industry);

            // Create the industry record
            industryInsight = await tx.industryInsight.create({
              data: {
                industry: data.industry,
                ...insights,
                nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
            console.log(
              `Successfully created industry insight with AI: ${industryInsight.id}`
            );
          } catch (aiError) {
            console.error("Error generating AI insights:", aiError);
            // Fall back to default values
            industryInsight = await tx.industryInsight.create({
              data: {
                industry: data.industry,
                salaryRanges: [],
                growthRate: 0,
                demandLevel: "MEDIUM",
                topSkills: [],
                marketOutlook: "NEUTRAL",
                recommendedSkills: [],
                keyTrends: [],
                nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
            console.log(
              `Created industry insight with default values: ${industryInsight.id}`
            );
          }
        } else {
          console.log(`Found existing industry insight: ${industryInsight.id}`);
        }

        // AFTER creating industry insight, now update the user
        console.log(
          `Now updating user ${user.id} with industry ${data.industry}`
        );
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry, // This will now reference an existing record
            experience: experience,
            bio: data.bio,
            skills: formattedSkills,
          },
        });
        console.log(`Successfully updated user: ${updatedUser.id}`);

        return { updatedUser, industryInsight };
      },
      {
        timeout: 15000, // increased timeout
      }
    );

    revalidatePath("/");
    console.log("Profile update completed successfully");
    return { success: true, user: result.updatedUser };
  } catch (error) {
    console.error("Error updating user and industry:", error);
    return {
      success: false,
      error: error.message || "Failed to update profile",
    };
  }
}

export async function getUserOnboardingStatus() {
  try {
    const { userId } = await auth();
    if (!userId) return { isOnboarded: false };

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return { isOnboarded: false, error: error.message };
  }
}
