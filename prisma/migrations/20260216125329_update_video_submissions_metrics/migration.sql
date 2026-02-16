/*
  Warnings:

  - You are about to drop the column `quality_flag` on the `video_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `video_score` on the `video_submissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "video_submissions" DROP COLUMN "quality_flag",
DROP COLUMN "video_score",
ADD COLUMN     "camera_engagement_Ratio" DOUBLE PRECISION,
ADD COLUMN     "face_presence_ratio" DOUBLE PRECISION,
ADD COLUMN     "yaw_variance" DOUBLE PRECISION;
