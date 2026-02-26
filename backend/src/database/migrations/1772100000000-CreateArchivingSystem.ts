import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateArchivingSystem1772100000000 implements MigrationInterface {
    name = 'CreateArchivingSystem1772100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Enums
        await queryRunner.query(`CREATE TYPE "public"."split_archives_archivereason_enum" AS ENUM('completed', 'expired', 'manually_archived', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."reminder_logs_remindertype_enum" AS ENUM('gentle', 'firm', 'final')`);
        await queryRunner.query(`CREATE TYPE "public"."reminder_logs_channel_enum" AS ENUM('email', 'push', 'in_app')`);
        await queryRunner.query(`CREATE TYPE "public"."reminder_logs_deliverystatus_enum" AS ENUM('sent', 'delivered', 'failed')`);

        // Create SplitArchive Table
        await queryRunner.query(`CREATE TABLE "split_archives" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "originalSplitId" uuid NOT NULL, 
            "splitData" jsonb NOT NULL, 
            "participantData" jsonb NOT NULL, 
            "paymentData" jsonb NOT NULL, 
            "archiveReason" "public"."split_archives_archivereason_enum" NOT NULL, 
            "archivedAt" TIMESTAMP NOT NULL DEFAULT now(), 
            "archivedBy" character varying NOT NULL, 
            CONSTRAINT "PK_split_archives_id" PRIMARY KEY ("id")
        )`);

        // Create ReminderLog Table
        await queryRunner.query(`CREATE TABLE "reminder_logs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "splitId" uuid NOT NULL, 
            "participantId" uuid NOT NULL, 
            "reminderType" "public"."reminder_logs_remindertype_enum" NOT NULL, 
            "channel" "public"."reminder_logs_channel_enum" NOT NULL, 
            "sentAt" TIMESTAMP NOT NULL DEFAULT now(), 
            "deliveryStatus" "public"."reminder_logs_deliverystatus_enum" NOT NULL DEFAULT 'sent', 
            CONSTRAINT "PK_reminder_logs_id" PRIMARY KEY ("id")
        )`);

        // Add expiryDate to Split Table
        await queryRunner.query(`ALTER TABLE "splits" ADD "expiryDate" TIMESTAMP`);

        // Add Foreign Keys for ReminderLog
        await queryRunner.query(`ALTER TABLE "reminder_logs" ADD CONSTRAINT "FK_reminder_logs_splitId" FOREIGN KEY ("splitId") REFERENCES "splits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reminder_logs" ADD CONSTRAINT "FK_reminder_logs_participantId" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reminder_logs" DROP CONSTRAINT "FK_reminder_logs_participantId"`);
        await queryRunner.query(`ALTER TABLE "reminder_logs" DROP CONSTRAINT "FK_reminder_logs_splitId"`);
        await queryRunner.query(`ALTER TABLE "splits" DROP COLUMN "expiryDate"`);
        await queryRunner.query(`DROP TABLE "reminder_logs"`);
        await queryRunner.query(`DROP TABLE "split_archives"`);
        await queryRunner.query(`DROP TYPE "public"."reminder_logs_deliverystatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reminder_logs_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reminder_logs_remindertype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."split_archives_archivereason_enum"`);
    }

}
