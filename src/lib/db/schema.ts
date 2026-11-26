import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const apiOrganisations = pgTable("api_organisations", {
 id:text("id").primaryKey(), name:text("name").notNull(), databaseUrlEncrypted:text("database_url_encrypted"),
 fleetCount:integer("fleet_count"), isActive:boolean("is_active").notNull().default(true),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
}, t=>({activeIdx:index("api_organisations_active_idx").on(t.isActive)}));
export const appUsers = pgTable("app_users", {
 ifcUserId:text("ifc_user_id").primaryKey(), ifcUsername:text("ifc_username"), discordUserId:text("discord_user_id"),
 discordUsername:text("discord_username"), onboardingCompletedAt:timestamp("onboarding_completed_at",{withTimezone:true}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});