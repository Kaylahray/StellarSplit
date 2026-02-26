import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePushNotificationEntities1772068000000 implements MigrationInterface {
    name = 'CreatePushNotificationEntities1772068000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Device Registration
        await queryRunner.query(`
            CREATE TYPE "public"."device_platform_enum" AS ENUM('web', 'android', 'ios')
        `);

        await queryRunner.query(`
            CREATE TABLE "device_registrations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "deviceToken" character varying NOT NULL,
                "platform" "public"."device_platform_enum" NOT NULL,
                "deviceName" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "lastSeenAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_device_registrations_id" PRIMARY KEY ("id")
            )
        `);

        // Notification Preference
        await queryRunner.query(`
            CREATE TYPE "public"."notification_event_type_enum" AS ENUM('split_created', 'payment_received', 'payment_reminder', 'split_completed', 'friend_request', 'group_invite')
        `);

        await queryRunner.query(`
            CREATE TABLE "notification_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "eventType" "public"."notification_event_type_enum" NOT NULL,
                "pushEnabled" boolean NOT NULL DEFAULT true,
                "emailEnabled" boolean NOT NULL DEFAULT true,
                "quietHoursStart" TIME,
                "quietHoursEnd" TIME,
                "timezone" character varying,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notification_preferences_id" PRIMARY KEY ("id")
            )
        `);

        // Add index on userId for faster lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_device_registrations_userId" ON "device_registrations" ("userId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_notification_preferences_userId" ON "notification_preferences" ("userId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_notification_preferences_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_device_registrations_userId"`);
        await queryRunner.query(`DROP TABLE "notification_preferences"`);
        await queryRunner.query(`DROP TYPE "public"."notification_event_type_enum"`);
        await queryRunner.query(`DROP TABLE "device_registrations"`);
        await queryRunner.query(`DROP TYPE "public"."device_platform_enum"`);
    }

}
